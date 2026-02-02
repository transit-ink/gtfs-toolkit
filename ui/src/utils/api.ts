import { useQuery } from '@tanstack/react-query';
import axios, { AxiosResponse } from 'axios';
import { Calendar, Route, Shape, Stop, StopTime, Trip } from '../types/gtfs';
import { BACKEND_HOST } from './constants';

/** Cache stale time: 5 minutes */
export const STALE_TIME_MS = 5 * 60 * 1000;

interface ApiResponse<T> {
  data: T;
}

// Rate limiter configuration
const MAX_CONCURRENT_REQUESTS = 5; // Maximum concurrent requests to backend
const REQUEST_DELAY_MS = 50; // Small delay between request batches to prevent bursts

// Rate limiter implementation - limits concurrent requests to prevent DoS
class RateLimiter {
  private queue: Array<() => void> = [];
  private activeRequests = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = async () => {
        this.activeRequests++;
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          this.processQueue();
        }
      };

      if (this.activeRequests < MAX_CONCURRENT_REQUESTS) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }

  private processQueue() {
    if (this.queue.length > 0 && this.activeRequests < MAX_CONCURRENT_REQUESTS) {
      const next = this.queue.shift();
      if (next) {
        // Add small delay to prevent request bursts
        setTimeout(() => {
          next();
        }, REQUEST_DELAY_MS);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// Rate-limited axios wrapper
const rateLimitedAxios = {
  get: <T = any>(url: string, config?: any): Promise<AxiosResponse<T>> => {
    return rateLimiter.execute(() => axios.get<T>(url, config));
  },
  post: <T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> => {
    return rateLimiter.execute(() => axios.post<T>(url, data, config));
  },
  put: <T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> => {
    return rateLimiter.execute(() => axios.put<T>(url, data, config));
  },
  delete: <T = any>(url: string, config?: any): Promise<AxiosResponse<T>> => {
    return rateLimiter.execute(() => axios.delete<T>(url, config));
  },
};

// Use rate-limited axios for all API calls
const api = rateLimitedAxios;

export interface RouteSearchResult {
  route: {
    route_id: string;
    route_short_name: string;
    route_long_name: string;
    agency_id?: string;
    route_desc?: string | null;
    route_type?: number;
    route_url?: string | null;
    route_color?: string | null;
    route_text_color?: string | null;
  };
  score: number;
}

export interface StopSearchResult {
  stop: {
    stop_id: string;
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
    stop_code?: string | null;
    stop_desc?: string | null;
    stop_url?: string | null;
    parent_station?: string | null;
  };
  score: number;
}

export type SearchResult = RouteSearchResult | StopSearchResult;

// Trip Planning types
export interface DirectRoute {
  type: 'direct';
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  from_stop_sequence: number;
  to_stop_sequence: number;
}

export interface InterchangeRoute {
  type: 'interchange';
  first_leg: {
    route_id: string;
    route_short_name: string;
    route_long_name: string;
    from_stop_sequence: number;
    to_stop_sequence: number;
  };
  interchange_stop: {
    stop_id: string;
    stop_name: string;
  };
  second_leg: {
    route_id: string;
    route_short_name: string;
    route_long_name: string;
    from_stop_sequence: number;
    to_stop_sequence: number;
  };
}

export type TripPlanResult = DirectRoute | InterchangeRoute;

// GTFS API Endpoints
export const getSearchResultsApi = (searchText: string): Promise<AxiosResponse<SearchResult[]>> =>
  api.get(`${BACKEND_HOST}/gtfs/search?q=${searchText}`);

export const getRouteApi = (id: string): Promise<AxiosResponse<Route>> =>
  api.get(`${BACKEND_HOST}/gtfs/routes/${encodeURIComponent(id)}`);

export const getRoutesBulkApi = (ids: string[]): Promise<AxiosResponse<Route[]>> =>
  api.get(`${BACKEND_HOST}/gtfs/routes/bulk`, {
    params: { ids: [...ids].sort().join(',') },
  });

export const getCalendarsBulkApi = (serviceIds: string[]): Promise<AxiosResponse<Calendar[]>> =>
  api.get(`${BACKEND_HOST}/gtfs/calendar/bulk`, {
    params: { ids: [...serviceIds].sort().join(',') },
  });

export const getTripsApi = (routeId: string): Promise<AxiosResponse<ApiResponse<Trip[]>>> =>
  api.get(`${BACKEND_HOST}/gtfs/trips`, {
    params: { routeId, page: 1, limit: 1000 },
  });

export const getTripsBulkByRouteIdsApi = (
  routeIds: string[]
): Promise<AxiosResponse<ApiResponse<Trip[]>>> =>
  api.get(`${BACKEND_HOST}/gtfs/trips`, {
    params: { routeIds: [...routeIds].sort().join(','), page: 1, limit: 10000 },
  });

export const getTripsBulkApi = async (ids: string[]): Promise<AxiosResponse<Trip[]>> => {
  // Batch size to avoid "431 Request Header Fields Too Large" error
  // Using 500 as a safe limit for query parameter length
  const BATCH_SIZE = 500;

  // Sort IDs before processing
  const sortedIds = [...ids].sort();

  if (sortedIds.length <= BATCH_SIZE) {
    // Single request if within batch size
    return api.get(`${BACKEND_HOST}/gtfs/trips/bulk`, {
      params: { ids: sortedIds.join(',') },
    });
  }

  // Split into batches and make multiple requests
  const batches: string[][] = [];
  for (let i = 0; i < sortedIds.length; i += BATCH_SIZE) {
    batches.push(sortedIds.slice(i, i + BATCH_SIZE));
  }

  // Make all requests in parallel (rate limiter will handle concurrency)
  const responses = await Promise.all(
    batches.map(batch =>
      api.get(`${BACKEND_HOST}/gtfs/trips/bulk`, {
        params: { ids: batch.join(',') },
      })
    )
  );

  // Combine all results
  const allTrips = responses.flatMap(response => response.data);

  // Return in the same format as a single request, using first response as template
  const firstResponse = responses[0];
  return {
    ...firstResponse,
    data: allTrips,
  };
};

export const getShapesBulkApi = (ids: string[]): Promise<AxiosResponse<Shape[]>> =>
  api.get(`${BACKEND_HOST}/gtfs/shapes/bulk`, {
    params: { ids: [...ids].sort().join(',') },
  });

export const getStopApi = (id: string): Promise<AxiosResponse<Stop>> =>
  api.get(`${BACKEND_HOST}/gtfs/stops/${encodeURIComponent(id)}`);

export const getStopsBulkApi = (ids: string[]): Promise<AxiosResponse<Stop[]>> =>
  api.get(`${BACKEND_HOST}/gtfs/stops/bulk`, {
    params: { ids: [...ids].sort().join(',') },
  });

export const getStopGroupApi = (id: string): Promise<AxiosResponse<Stop[]>> =>
  api.get(`${BACKEND_HOST}/gtfs/stops/group/${encodeURIComponent(id)}`);

export const getStopTimesApi = async ({
  tripIds,
  stopIds,
}: {
  tripIds?: string[];
  stopIds?: string[];
}): Promise<AxiosResponse<ApiResponse<StopTime[]>>> => {
  // Make first request with limit 10000
  const firstResponse = await api.get<{
    data: StopTime[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>(`${BACKEND_HOST}/gtfs/stop_times`, {
    params: {
      tripId: tripIds ? [...tripIds].sort().join(',') : undefined,
      stopId: stopIds ? [...stopIds].sort().join(',') : undefined,
      page: 1,
      limit: 10000,
    },
  });

  const { data: firstData, meta: firstMeta } = firstResponse.data;

  // If there are multiple pages, fetch all remaining pages
  if (firstMeta.totalPages > 1) {
    const remainingPages: Promise<
      AxiosResponse<{
        data: StopTime[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>
    >[] = [];

    for (let page = 2; page <= firstMeta.totalPages; page++) {
      remainingPages.push(
        api.get<{
          data: StopTime[];
          meta: { total: number; page: number; limit: number; totalPages: number };
        }>(`${BACKEND_HOST}/gtfs/stop_times`, {
          params: {
            tripId: tripIds ? [...tripIds].sort().join(',') : undefined,
            stopId: stopIds ? [...stopIds].sort().join(',') : undefined,
            page,
            limit: 10000,
          },
        })
      );
    }

    // Fetch all remaining pages in parallel
    const remainingResponses = await Promise.all(remainingPages);

    // Combine all results
    const allStopTimes = [
      ...firstData,
      ...remainingResponses.flatMap(response => response.data.data),
    ];

    // Return response in the same format as the original
    return {
      ...firstResponse,
      data: {
        data: allStopTimes,
      },
    } as AxiosResponse<ApiResponse<StopTime[]>>;
  }

  // If only one page, return the first response in the expected format
  return {
    ...firstResponse,
    data: {
      data: firstData,
    },
  } as AxiosResponse<ApiResponse<StopTime[]>>;
};

// Search stops only (for trip planning) - filters out child stops (stops with parent_station)
export const searchStopsApi = (searchText: string): Promise<AxiosResponse<StopSearchResult[]>> =>
  api.get(`${BACKEND_HOST}/gtfs/search?q=${searchText}`).then(response => ({
    ...response,
    data: (response.data.filter((r: SearchResult) => 'stop' in r) as StopSearchResult[]).filter(
      (r: StopSearchResult) => !r.stop.parent_station
    ),
  }));

// Trip Planning
export const planTripApi = (
  fromStopId: string,
  toStopId: string
): Promise<AxiosResponse<TripPlanResult[]>> =>
  api.get(`${BACKEND_HOST}/gtfs/plan`, {
    params: { from: fromStopId, to: toStopId },
  });

// Explore - Get stops within bounds
export interface StopsInBoundsParams {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  limit?: number;
}

export const getStopsInBoundsApi = (params: StopsInBoundsParams): Promise<AxiosResponse<Stop[]>> =>
  api.get(`${BACKEND_HOST}/gtfs/stops/bounds`, { params });

// --- Query keys ---
export const queryKeys = {
  search: (q: string) => ['search', q] as const,
  searchStops: (q: string) => ['searchStops', q] as const,
  route: (id: string) => ['route', id] as const,
  routeDetails: (id: string) => ['routeDetails', id] as const,
  stop: (id: string) => ['stop', id] as const,
  stopDetails: (id: string) => ['stopDetails', id] as const,
  group: (id: string) => ['group', id] as const,
  groupsBulk: (ids: string[]) => ['groupsBulk', ids.sort().join(',')] as const,
  stopsInBounds: (params: StopsInBoundsParams) => ['stopsInBounds', params] as const,
  planTrip: (from: string, to: string) => ['planTrip', from, to] as const,
  stopsBulk: (ids: string[]) => ['stopsBulk', ids.sort().join(',')] as const,
};

// --- Composite data fetchers (for useQuery cache) ---
export interface RouteDetailsData {
  route: Route;
  trips: Trip[];
  shapes: Shape[];
  stopTimes: StopTime[];
  stops: Stop[];
  calendars: Calendar[];
}

export async function getRouteDetailsData(routeId: string): Promise<RouteDetailsData> {
  const { data: route } = await getRouteApi(routeId);
  const { data: { data: trips } } = await getTripsApi(routeId);
  const shapeIds = [...new Set(trips.map((t) => t.shape_id).filter(Boolean))] as string[];
  const tripIds = [...new Set(trips.map((t) => t.trip_id).filter(Boolean))] as string[];
  const serviceIds = [...new Set(trips.map((t) => t.service_id).filter(Boolean))] as string[];

  let shapes: Shape[] = [];
  if (shapeIds.length > 0) {
    const { data: shapesData } = await getShapesBulkApi(shapeIds);
    shapes = shapesData;
  }

  const { data: { data: stopTimes } } = await getStopTimesApi({ tripIds });
  const stopIds = [...new Set(stopTimes.map((st) => st.stop_id).filter(Boolean))] as string[];

  let stops: Stop[] = [];
  if (stopIds.length > 0) {
    const { data: stopsData } = await getStopsBulkApi(stopIds);
    stops = stopsData;
  }

  let calendars: Calendar[] = [];
  if (serviceIds.length > 0) {
    const { data } = await getCalendarsBulkApi(serviceIds);
    calendars = data;
  }

  return { route, trips, shapes, stopTimes, stops, calendars };
}

export interface StopDetailsData {
  stops: Stop[];
  primaryStop: Stop;
  stopTimes: StopTime[];
  trips: Trip[];
  routes: Route[];
}

export type StopDetailsResult = { redirect: string } | StopDetailsData;

export async function getStopDetailsData(stopId: string): Promise<StopDetailsResult> {
  const { data: stop } = await getStopApi(stopId);
  if (stop.parent_station) {
    return { redirect: stop.parent_station };
  }
  const { data: stops } = await getStopGroupApi(stopId);
  const primaryStop = stops.find((s) => s.stop_id === stopId) || stops[0];
  if (!primaryStop) {
    throw new Error('Stop not found');
  }
  const allStopIds = stops.map((s) => s.stop_id);
  const { data: { data: stopTimes } } = await getStopTimesApi({ stopIds: allStopIds });
  const tripIds = [...new Set(stopTimes.map((st) => st.trip_id).filter(Boolean))] as string[];
  const { data: trips } = tripIds.length > 0 ? await getTripsBulkApi(tripIds) : { data: [] };
  const routeIds = [...new Set((trips as Trip[]).map((t) => t.route_id).filter(Boolean))] as string[];
  const { data: routes } =
    routeIds.length > 0 ? await getRoutesBulkApi(routeIds) : { data: [] };
  return {
    stops,
    primaryStop,
    stopTimes,
    trips: trips as Trip[],
    routes: routes as Route[],
  };
}

// Group types
export enum GroupItemType {
  ROUTE = 'route',
  STOP = 'stop',
}

export interface GroupItem {
  type: GroupItemType;
  id: string;
}

export interface Group {
  id: string;
  group_id: string;
  name: string;
  description?: string;
  items: GroupItem[];
  created_at: string;
  updated_at: string;
}

// Group API
export const getGroupApi = (groupId: string): Promise<AxiosResponse<Group>> =>
  api.get(`${BACKEND_HOST}/groups/${groupId}`);

export const getGroupsBulkApi = (groupIds: string[]): Promise<AxiosResponse<Group[]>> =>
  api.get(`${BACKEND_HOST}/groups/bulk`, {
    params: { ids: [...groupIds].sort().join(',') },
  });

export interface GroupDetailsData {
  group: Group;
  routes: { route: Route; shapes: Shape[] }[];
  stops: Stop[];
}

export async function getGroupDetailsData(groupId: string): Promise<GroupDetailsData> {
  const { data: group } = await getGroupApi(groupId);
  const routeItems = group.items.filter((item: GroupItem) => item.type === GroupItemType.ROUTE);
  const stopItems = group.items.filter((item: GroupItem) => item.type === GroupItemType.STOP);
  const routeIds = routeItems.map((item) => item.id);
  const { data: routesData } =
    routeIds.length > 0 ? await getRoutesBulkApi(routeIds) : { data: [] };
  const { data: { data: allTrips } } =
    routeIds.length > 0 ? await getTripsBulkByRouteIdsApi(routeIds) : { data: { data: [] } };
  const tripsByRouteId = new Map<string, Trip[]>();
  (allTrips as Trip[]).forEach((trip) => {
    if (!tripsByRouteId.has(trip.route_id)) tripsByRouteId.set(trip.route_id, []);
    tripsByRouteId.get(trip.route_id)!.push(trip);
  });
  const allShapeIds = [
    ...new Set((allTrips as Trip[]).map((t) => t.shape_id).filter(Boolean)),
  ] as string[];
  const { data: allShapes } =
    allShapeIds.length > 0 ? await getShapesBulkApi(allShapeIds) : { data: [] };
  const shapesByShapeId = new Map<string, Shape[]>();
  allShapes.forEach((shape) => {
    if (!shapesByShapeId.has(shape.shape_id)) shapesByShapeId.set(shape.shape_id, []);
    shapesByShapeId.get(shape.shape_id)!.push(shape);
  });
  const routes: GroupDetailsData['routes'] = routeItems
    .map((item) => {
      const route = routesData.find((r) => r.route_id === item.id);
      if (!route) return null;
      const trips = tripsByRouteId.get(item.id) || [];
      const routeShapeIds = [
        ...new Set(trips.map((t) => t.shape_id).filter(Boolean)),
      ] as string[];
      const shapes = routeShapeIds.flatMap((shapeId) => shapesByShapeId.get(shapeId) || []);
      return { route, shapes };
    })
    .filter((r): r is { route: Route; shapes: Shape[] } => r !== null);
  const stops = await Promise.all(
    stopItems.map((item) => getStopApi(item.id).then((res) => res.data))
  );
  return { group, routes, stops };
}

// --- React Query hooks (5min cache via default staleTime) ---
export function useSearchResults(searchText: string) {
  return useQuery({
    queryKey: queryKeys.search(searchText),
    queryFn: () => getSearchResultsApi(searchText).then((r) => r.data),
    enabled: !!searchText.trim(),
  });
}

export function useSearchStops(searchText: string) {
  return useQuery({
    queryKey: queryKeys.searchStops(searchText),
    queryFn: () =>
      getSearchResultsApi(searchText).then((res) =>
        (res.data.filter((r: SearchResult) => 'stop' in r) as StopSearchResult[]).filter(
          (r: StopSearchResult) => !r.stop.parent_station
        )
      ),
    enabled: !!searchText.trim(),
  });
}

export function useRouteDetails(routeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.routeDetails(routeId ?? ''),
    queryFn: () => getRouteDetailsData(routeId!),
    enabled: !!routeId,
  });
}

export function useStopDetails(stopId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.stopDetails(stopId ?? ''),
    queryFn: () => getStopDetailsData(stopId!),
    enabled: !!stopId,
  });
}

export function useGroupDetails(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.group(groupId ?? ''),
    queryFn: () => getGroupDetailsData(groupId!),
    enabled: !!groupId,
  });
}

export function useGroupsBulk(ids: string[]) {
  return useQuery({
    queryKey: queryKeys.groupsBulk(ids),
    queryFn: () => getGroupsBulkApi(ids).then((r) => r.data),
    enabled: ids.length > 0,
  });
}

const EMPTY_BOUNDS: StopsInBoundsParams = {
  minLat: 0,
  maxLat: 0,
  minLon: 0,
  maxLon: 0,
};

export function useStopsInBounds(params: StopsInBoundsParams | null) {
  const enabled =
    params != null &&
    params.minLat != null &&
    params.maxLat != null &&
    params.minLon != null &&
    params.maxLon != null;
  return useQuery({
    queryKey: queryKeys.stopsInBounds(params ?? EMPTY_BOUNDS),
    queryFn: () => getStopsInBoundsApi(params!).then((r) => r.data),
    enabled,
  });
}

export function usePlanTrip(fromStopId: string | undefined, toStopId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.planTrip(fromStopId ?? '', toStopId ?? ''),
    queryFn: () => planTripApi(fromStopId!, toStopId!).then((r) => r.data),
    enabled: !!fromStopId && !!toStopId,
  });
}

export function useStopsBulk(ids: string[]) {
  return useQuery({
    queryKey: queryKeys.stopsBulk(ids),
    queryFn: () => getStopsBulkApi(ids).then((r) => r.data),
    enabled: ids.length > 0,
  });
}
