import { Route, RouteSearchResult, Shape, Stop, StopTime, Trip } from '@/types/gtfs';
import { Calendar } from '@/types/calendar';
import axios from '@/utils/axios';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Search routes by short name
export const searchRoutes = async (query: string): Promise<RouteSearchResult[]> => {
  const response = await axios.get<RouteSearchResult[]>('/gtfs/routes/search', {
    params: { q: query },
  });
  return response.data;
};

// Get a single route by ID
export const getRoute = async (id: string): Promise<Route> => {
  const response = await axios.get<Route>(`/gtfs/routes/${encodeURIComponent(id)}`);
  return response.data;
};

// Get routes by IDs (bulk)
export const getRoutesBulk = async (ids: string[]): Promise<Route[]> => {
  if (ids.length === 0) return [];
  const response = await axios.get<Route[]>('/gtfs/routes/bulk', {
    params: { ids: ids.join(',') },
  });
  return response.data;
};

// Update a route
export const updateRoute = async (id: string, route: Partial<Route>): Promise<Route> => {
  const response = await axios.put<Route>(`/gtfs/routes/${encodeURIComponent(id)}`, route);
  return response.data;
};

// Get trips for a route
export const getTripsForRoute = async (routeId: string): Promise<Trip[]> => {
  const response = await axios.get<PaginatedResponse<Trip>>('/gtfs/trips', {
    params: { routeId, page: 1, limit: 1000 },
  });
  return response.data.data;
};

// Get trips for multiple routes (bulk)
export const getTripsBulkByRouteIds = async (routeIds: string[]): Promise<Trip[]> => {
  if (routeIds.length === 0) return [];
  const response = await axios.get<PaginatedResponse<Trip>>('/gtfs/trips', {
    params: { routeIds: routeIds.join(','), page: 1, limit: 10000 },
  });
  return response.data.data;
};

// Get shapes by IDs
export const getShapesBulk = async (ids: string[]): Promise<Shape[]> => {
  if (ids.length === 0) return [];
  const response = await axios.get<Shape[]>('/gtfs/shapes/bulk', {
    params: { ids: ids.join(',') },
  });
  return response.data;
};

// Get stop times for trips
export const getStopTimes = async (tripIds: string[]): Promise<StopTime[]> => {
  if (tripIds.length === 0) return [];
  
  // Make first request with limit 10000
  const firstResponse = await axios.get<PaginatedResponse<StopTime>>('/gtfs/stop_times', {
    params: { tripId: tripIds.join(','), page: 1, limit: 10000 },
  });

  const { data: firstData, meta: firstMeta } = firstResponse.data;
  
  // If there are multiple pages, fetch all remaining pages
  if (firstMeta.totalPages > 1) {
    const remainingPages = [];
    
    for (let page = 2; page <= firstMeta.totalPages; page++) {
      remainingPages.push(
        axios.get<PaginatedResponse<StopTime>>('/gtfs/stop_times', {
          params: { tripId: tripIds.join(','), page, limit: 10000 },
        })
      );
    }
    
    // Fetch all remaining pages in parallel
    const remainingResponses = await Promise.all(remainingPages);
    
    // Combine all results
    const allStopTimes = [
      ...firstData,
      ...remainingResponses.flatMap(response => response.data.data)
    ];
    
    return allStopTimes;
  }
  
  // If only one page, return the first response data
  return firstData;
};

// Get stops by IDs
export const getStopsBulk = async (ids: string[]): Promise<Stop[]> => {
  if (ids.length === 0) return [];
  const response = await axios.get<Stop[]>('/gtfs/stops/bulk', {
    params: { ids: ids.join(',') },
  });
  return response.data;
};

// Reorder stop times for trips
export const reorderStopTimes = async (
  tripIds: string[],
  stopSequence: { stopId: string; sequence: number }[]
): Promise<{ updated: number }> => {
  const response = await axios.post<{ updated: number }>('/gtfs/stop_times/reorder', {
    tripIds,
    stopSequence,
  });
  return response.data;
};

// Update shape points
export interface ShapePoint {
  lat: number;
  lon: number;
  sequence: number;
  distTraveled?: number;
}

export const updateShape = async (
  shapeId: string,
  points: ShapePoint[]
): Promise<{ updated: number }> => {
  const response = await axios.post<{ updated: number }>('/gtfs/shapes/update', {
    shapeId,
    points,
  });
  return response.data;
};

// Add a stop to multiple trips (at the end)
export const addStopToTrips = async (
  tripIds: string[],
  stopId: string,
  arrivalTime: string,
  departureTime: string
): Promise<{ added: number }> => {
  const response = await axios.post<{ added: number }>('/gtfs/stop_times/add-stop', {
    tripIds,
    stopId,
    arrivalTime,
    departureTime,
  });
  return response.data;
};

// Remove a stop from multiple trips
export const removeStopFromTrips = async (
  tripIds: string[],
  stopId: string
): Promise<{ removed: number }> => {
  const response = await axios.post<{ removed: number }>('/gtfs/stop_times/remove-stop', {
    tripIds,
    stopId,
  });
  return response.data;
};

// Update stop time
export const updateStopTime = async (
  stopTimeId: number,
  stopTime: Partial<StopTime>
): Promise<StopTime> => {
  const response = await axios.put<StopTime>(`/gtfs/stop_times/${stopTimeId}`, stopTime);
  return response.data;
};

// Bulk update stop times
export interface BulkUpdateStopTime {
  tripId: string;
  stopId: string;
  arrivalTime?: string;
  departureTime?: string;
}

export const bulkUpdateStopTimes = async (
  updates: BulkUpdateStopTime[]
): Promise<{ updated: number }> => {
  const response = await axios.post<{ updated: number }>('/gtfs/stop_times/bulk-update', {
    updates,
  });
  return response.data;
};

// Duplicate a trip with incremented stop times
export const duplicateTrip = async (
  sourceTripId: string,
  newTripId: string,
  timeIncrementMinutes: number = 5
): Promise<{ trip: Trip; stopTimes: StopTime[] }> => {
  const response = await axios.post<{ trip: Trip; stopTimes: StopTime[] }>(
    `/gtfs/trips/duplicate/${encodeURIComponent(sourceTripId)}`,
    {
      newTripId,
      timeIncrementMinutes,
    }
  );
  return response.data;
};

// Delete a trip
export const deleteTrip = async (tripId: string): Promise<void> => {
  await axios.delete(`/gtfs/trips/${encodeURIComponent(tripId)}`);
};

// Get calendars by service IDs
export const getCalendarsBulk = async (serviceIds: string[]): Promise<Calendar[]> => {
  if (serviceIds.length === 0) return [];
  const response = await axios.get<Calendar[]>('/gtfs/calendar/bulk', {
    params: { ids: [...serviceIds].sort().join(',') },
  });
  return response.data;
};
