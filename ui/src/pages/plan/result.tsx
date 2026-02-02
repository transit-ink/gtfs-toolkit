import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Bus, MapPin, Navigation } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleLoaderBlock } from '../../components/circleLoader';
import Sidebar from '../../components/sidebar';
import TripResultMap from '../../components/tripResultMap';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Route, Shape, Stop, StopTime, Trip } from '../../types/gtfs';
import {
  getRoutesBulkApi,
  getShapesBulkApi,
  getStopGroupApi,
  getStopsBulkApi,
  getStopsInBoundsApi,
  getStopTimesApi,
  getTripsApi,
} from '../../utils/api';

interface RouteSegment {
  routeId: string;
  routeShortName: string;
  shapes: Shape[];
  stopTimes: StopTime[];
  stops: Stop[];
  color: string;
  // For timetable display - all trips for this segment
  allTripStopTimes: { tripId: string; stopTimes: { [stopId: string]: StopTime } }[];
  stopSequence: string[]; // Ordered stop IDs for this segment
}

interface TripResultData {
  type: 'direct' | 'interchange';
  fromStop: Stop;
  toStop: Stop;
  interchangeStop?: Stop;
  segments: RouteSegment[];
  routes: Route[];
  allStops: Stop[];
}

const ROUTE_COLORS = ['#3b82f6', '#8b5cf6']; // Blue for first leg, purple for second

// --- List item components (extracted for React Compiler) ---

interface RouteSummarySegmentItemProps {
  segment: RouteSegment;
  interchangeStop?: Stop;
  showInterchangeBefore: boolean;
}

function RouteSummarySegmentItem({
  segment,
  interchangeStop,
  showInterchangeBefore,
}: RouteSummarySegmentItemProps) {
  return (
    <div>
      {showInterchangeBefore && interchangeStop && (
        <div className="flex items-center gap-3 py-3 border-t border-dashed">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-blue-600 font-medium">Change at</div>
            <Link to={`/stop/${interchangeStop.stop_id}`} className="text-sm hover:underline">
              {interchangeStop.stop_name}
            </Link>
          </div>
        </div>
      )}
      <Link
        to={`/route/${segment.routeId}`}
        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${segment.color}20` }}
        >
          <Bus className="w-5 h-5" style={{ color: segment.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium">{segment.routeShortName}</div>
          <div className="text-sm text-muted-foreground">{segment.stops.length} stops</div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </Link>
    </div>
  );
}

interface SegmentStopRowProps {
  stopId: string;
  index: number;
  segment: RouteSegment;
  fromStop: Stop;
  toStop: Stop;
  interchangeStop?: Stop;
}

function SegmentStopRow({
  stopId,
  index,
  segment,
  fromStop,
  toStop,
  interchangeStop,
}: SegmentStopRowProps) {
  const stop = segment.stops.find(s => s.stop_id === stopId);
  const isFrom =
    stopId === fromStop.stop_id || stop?.parent_station === fromStop.stop_id || index === 0;
  const isTo =
    stopId === toStop.stop_id ||
    stop?.parent_station === toStop.stop_id ||
    index === segment.stopSequence.length - 1;
  const isInterchange =
    interchangeStop &&
    (stopId === interchangeStop.stop_id || stop?.parent_station === interchangeStop.stop_id);

  let markerStyle = 'bg-background border-2';
  let borderColor = segment.color;

  if (isFrom && index === 0) {
    markerStyle = 'bg-green-500';
    borderColor = '';
  } else if (isTo && index === segment.stopSequence.length - 1) {
    markerStyle = 'bg-red-500';
    borderColor = '';
  } else if (isInterchange) {
    markerStyle = 'bg-blue-500';
    borderColor = '';
  }

  return (
    <Link
      to={`/stop/${stop?.parent_station || stopId}`}
      className="flex items-center gap-2 h-10 px-3 hover:bg-accent transition-colors"
    >
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center z-10 shrink-0 ${markerStyle}`}
        style={borderColor ? { borderColor } : {}}
      >
        {((isFrom && index === 0) ||
          (isTo && index === segment.stopSequence.length - 1) ||
          isInterchange) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
      </div>
      <span className="text-sm truncate max-w-[180px]">{stop?.stop_name || stopId}</span>
    </Link>
  );
}

interface TripTimeCellProps {
  stopTime: StopTime | undefined;
}

function TripTimeCell({ stopTime }: TripTimeCellProps) {
  const time = stopTime?.departure_time || stopTime?.arrival_time;
  const displayTime = time ? time.substring(0, 5) : '-';
  return (
    <div className="h-10 px-2 flex items-center justify-center">
      <span className="text-xs font-mono">{displayTime}</span>
    </div>
  );
}

interface SegmentTripColumnProps {
  trip: { tripId: string; stopTimes: { [stopId: string]: StopTime } };
  tripIndex: number;
  stopSequence: string[];
}

function SegmentTripColumn({ trip, tripIndex, stopSequence }: SegmentTripColumnProps) {
  return (
    <div className="min-w-[70px] border-r last:border-r-0">
      <div className="h-10 border-b px-2 flex items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground">#{tripIndex + 1}</span>
      </div>
      {stopSequence.map((stopId, stopIndex) => (
        <TripTimeCell
          key={`${trip.tripId}-${stopId}-${stopIndex}`}
          stopTime={trip.stopTimes[stopId]}
        />
      ))}
    </div>
  );
}

interface SegmentStopsSectionProps {
  segment: RouteSegment;
  data: TripResultData;
}

function SegmentStopsSection({ segment, data }: SegmentStopsSectionProps) {
  return (
    <section className="overflow-hidden">
      <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        <Bus className="w-4 h-4" style={{ color: segment.color }} />
        {segment.routeShortName} Stops & Times
      </h2>
      {segment.allTripStopTimes.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2">
          Scroll right to see all {segment.allTripStopTimes.length} trip
          {segment.allTripStopTimes.length > 1 ? 's' : ''}
        </p>
      )}
      <div className="overflow-x-auto">
        <div className="min-w-max flex">
          <div className="sticky left-0 z-10 bg-background border-r">
            <div className="h-10 border-b px-3 flex items-center">
              <span className="text-xs font-medium text-muted-foreground">Stop</span>
            </div>
            <div className="relative">
              <div
                className="absolute left-[17px] top-3 bottom-3 w-0.5"
                style={{ backgroundColor: `${segment.color}30` }}
              />
              {segment.stopSequence.map((stopId, index) => (
                <SegmentStopRow
                  key={`stop-${stopId}-${index}`}
                  stopId={stopId}
                  index={index}
                  segment={segment}
                  fromStop={data.fromStop}
                  toStop={data.toStop}
                  interchangeStop={data.interchangeStop}
                />
              ))}
            </div>
          </div>
          <div className="flex">
            {segment.allTripStopTimes.map((trip, tripIndex) => (
              <SegmentTripColumn
                key={trip.tripId}
                trip={trip}
                tripIndex={tripIndex}
                stopSequence={segment.stopSequence}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Helper function to find a trip that serves both from and to stops in the correct order
// fromStopIds and toStopIds include both parent and child stop IDs
function findValidTrip(
  trips: Trip[],
  allStopTimes: StopTime[],
  fromStopIds: Set<string>,
  toStopIds: Set<string>
): { trip: Trip; fromIndex: number; toIndex: number } | undefined {
  for (const trip of trips) {
    const tripStopTimes = allStopTimes
      .filter(st => st.trip_id === trip.trip_id)
      .sort((a, b) => a.stop_sequence - b.stop_sequence);

    const fromIndex = tripStopTimes.findIndex(st => fromStopIds.has(st.stop_id));
    const toIndex = tripStopTimes.findIndex(st => toStopIds.has(st.stop_id));

    // This trip serves both stops in the right order
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
      return { trip, fromIndex, toIndex };
    }
  }
  return undefined;
}

// Helper function to build timetable data for trips that serve a segment
// fromStopIds and toStopIds include both parent and child stop IDs
function buildTimetableData(
  trips: Trip[],
  allStopTimes: StopTime[],
  fromStopIds: Set<string>,
  toStopIds: Set<string>,
  stopSequence: string[]
): { tripId: string; stopTimes: { [stopId: string]: StopTime } }[] {
  const result: { tripId: string; stopTimes: { [stopId: string]: StopTime }; firstTime: string }[] =
    [];

  for (const trip of trips) {
    const tripStopTimes = allStopTimes
      .filter(st => st.trip_id === trip.trip_id)
      .sort((a, b) => a.stop_sequence - b.stop_sequence);

    // Check if this trip serves both from and to stops in the right order
    const fromIndex = tripStopTimes.findIndex(st => fromStopIds.has(st.stop_id));
    const toIndex = tripStopTimes.findIndex(st => toStopIds.has(st.stop_id));

    if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
      continue; // Skip trips that don't serve this segment in the right direction
    }

    // Build stop times map for this trip
    const stopTimesMap: { [stopId: string]: StopTime } = {};
    tripStopTimes.forEach(st => {
      if (stopSequence.includes(st.stop_id)) {
        stopTimesMap[st.stop_id] = st;
      }
    });

    // Get departure time at first stop for sorting
    const firstStopTime = tripStopTimes[fromIndex];
    const firstTime = firstStopTime?.departure_time || '';

    result.push({
      tripId: trip.trip_id,
      stopTimes: stopTimesMap,
      firstTime,
    });
  }

  // Sort by departure time at first stop
  result.sort((a, b) => a.firstTime.localeCompare(b.firstTime));

  // Return without firstTime (it was just for sorting)
  return result.map(({ tripId, stopTimes }) => ({ tripId, stopTimes }));
}

// Helper to get all stop IDs for a stop (parent + children + nearby stops and their children)
// This mirrors the backend's approach of expanding stops within ~500m
async function getExpandedStopGroup(stop: Stop): Promise<Set<string>> {
  const stopIds = new Set<string>();

  try {
    // Get the stop group and nearby stops in parallel
    const delta = 0.005;
    const lat = Number(stop.stop_lat);
    const lon = Number(stop.stop_lon);

    const [groupResult, nearbyResult] = await Promise.all([
      getStopGroupApi(stop.stop_id).catch(() => ({ data: [] as Stop[] })),
      getStopsInBoundsApi({
        minLat: lat - delta,
        maxLat: lat + delta,
        minLon: lon - delta,
        maxLon: lon + delta,
        limit: 100,
      }).catch(() => ({ data: [] as Stop[] })),
    ]);

    // Add stops from the group
    groupResult.data.forEach(s => stopIds.add(s.stop_id));

    // Add nearby stops
    nearbyResult.data.forEach(s => stopIds.add(s.stop_id));

    // Get children of all nearby stops in parallel
    const nearbyParentIds = nearbyResult.data.map(s => s.stop_id);
    const childResults = await Promise.all(
      nearbyParentIds.map(parentId =>
        getStopGroupApi(parentId).catch(() => ({ data: [] as Stop[] }))
      )
    );

    childResults.forEach(result => {
      result.data.forEach(s => stopIds.add(s.stop_id));
    });
  } catch {
    // If everything fails, just return the single stop ID
    stopIds.add(stop.stop_id);
  }

  return stopIds;
}

export default function TripResultPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TripResultData | null>(null);

  usePageMeta({
    title: data ? `${data.fromStop.stop_name} to ${data.toStop.stop_name}` : 'Trip Details',
    description: data
      ? `${data.fromStop.stop_name} to ${data.toStop.stop_name} | Route planner`
      : 'View your planned trip details with route map and stops.',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const type = searchParams.get('type') as 'direct' | 'interchange';
        const fromStopId = searchParams.get('from');
        const toStopId = searchParams.get('to');
        const route1Id = searchParams.get('route1');
        const route2Id = searchParams.get('route2');
        const interchangeStopId = searchParams.get('interchange');

        if (!type || !fromStopId || !toStopId || !route1Id) {
          throw new Error('Missing required parameters');
        }

        // Fetch routes
        const routeIds = [route1Id];
        if (route2Id) routeIds.push(route2Id);
        const { data: routes } = await getRoutesBulkApi(routeIds);

        // Fetch trips for each route
        const allTrips: Trip[] = [];
        const allShapes: Shape[] = [];
        const allStopTimes: StopTime[] = [];
        const tripsByRoute: { [routeId: string]: Trip[] } = {};

        for (const routeId of routeIds) {
          const {
            data: { data: trips },
          } = await getTripsApi(routeId);
          allTrips.push(...trips);
          tripsByRoute[routeId] = trips;

          // Get shapes
          const shapeIds = [...new Set(trips.map(t => t.shape_id).filter(Boolean))] as string[];
          if (shapeIds.length > 0) {
            const { data: shapes } = await getShapesBulkApi(shapeIds);
            allShapes.push(...shapes);
          }

          // Get stop times for ALL trips (for timetable display)
          const tripIds = trips.map(t => t.trip_id);
          if (tripIds.length > 0) {
            const {
              data: { data: stopTimes },
            } = await getStopTimesApi({ tripIds });
            allStopTimes.push(...stopTimes);
          }
        }

        // Collect all stop IDs
        const stopIds = new Set<string>();
        stopIds.add(fromStopId);
        stopIds.add(toStopId);
        if (interchangeStopId) stopIds.add(interchangeStopId);
        allStopTimes.forEach(st => stopIds.add(st.stop_id));

        // Fetch all stops
        const { data: stops } = await getStopsBulkApi([...stopIds]);

        const fromStop = stops.find(s => s.stop_id === fromStopId);
        const toStop = stops.find(s => s.stop_id === toStopId);
        const interchangeStop = interchangeStopId
          ? stops.find(s => s.stop_id === interchangeStopId)
          : undefined;

        if (!fromStop || !toStop) {
          throw new Error('Could not find from/to stops');
        }

        // Get expanded stop groups (parent + children + nearby stops) for matching
        // This mirrors the backend's approach
        const fromStopIds = await getExpandedStopGroup(fromStop);
        const toStopIds = await getExpandedStopGroup(toStop);
        const interchangeStopIds = interchangeStop
          ? await getExpandedStopGroup(interchangeStop)
          : new Set<string>();

        // Build segments
        const segments: RouteSegment[] = [];

        if (type === 'direct') {
          const route = routes.find(r => r.route_id === route1Id);
          const routeTrips = tripsByRoute[route1Id] || [];

          // Find a trip that serves both from and to stops in the right order
          const validTripResult = findValidTrip(routeTrips, allStopTimes, fromStopIds, toStopIds);

          if (route && validTripResult) {
            const { trip: validTrip, fromIndex, toIndex } = validTripResult;
            const tripStopTimes = allStopTimes
              .filter(st => st.trip_id === validTrip.trip_id)
              .sort((a, b) => a.stop_sequence - b.stop_sequence);

            // Get only the stops between from and to
            const relevantStopTimes = tripStopTimes.slice(Math.max(0, fromIndex), toIndex + 1);

            const relevantStopIds = relevantStopTimes.map(st => st.stop_id);
            const relevantStops = stops.filter(s => relevantStopIds.includes(s.stop_id));

            // Get shapes for this trip
            const routeShapes = allShapes.filter(s => s.shape_id === validTrip.shape_id);

            // Build timetable data for all trips that serve this segment
            const stopSequence = relevantStopIds;
            const allTripStopTimes = buildTimetableData(
              routeTrips,
              allStopTimes,
              fromStopIds,
              toStopIds,
              stopSequence
            );

            segments.push({
              routeId: route.route_id,
              routeShortName: route.route_short_name,
              shapes: routeShapes,
              stopTimes: relevantStopTimes,
              stops: relevantStops,
              color: ROUTE_COLORS[0],
              allTripStopTimes,
              stopSequence,
            });
          }
        } else if (type === 'interchange' && route2Id && interchangeStop) {
          // First leg
          const route1 = routes.find(r => r.route_id === route1Id);
          const route1Trips = tripsByRoute[route1Id] || [];

          // Find a trip that serves both from and interchange stops in the right order
          const validTripResult1 = findValidTrip(
            route1Trips,
            allStopTimes,
            fromStopIds,
            interchangeStopIds
          );

          if (route1 && validTripResult1) {
            const { trip: validTrip1, fromIndex, toIndex: interchangeIndex } = validTripResult1;
            const tripStopTimes1 = allStopTimes
              .filter(st => st.trip_id === validTrip1.trip_id)
              .sort((a, b) => a.stop_sequence - b.stop_sequence);

            const relevantStopTimes1 = tripStopTimes1.slice(
              Math.max(0, fromIndex),
              interchangeIndex + 1
            );

            const relevantStopIds1 = relevantStopTimes1.map(st => st.stop_id);
            const relevantStops1 = stops.filter(s => relevantStopIds1.includes(s.stop_id));

            const routeShapes1 = allShapes.filter(s => s.shape_id === validTrip1.shape_id);

            // Build timetable data for first leg
            const stopSequence1 = relevantStopIds1;
            const allTripStopTimes1 = buildTimetableData(
              route1Trips,
              allStopTimes,
              fromStopIds,
              interchangeStopIds,
              stopSequence1
            );

            segments.push({
              routeId: route1.route_id,
              routeShortName: route1.route_short_name,
              shapes: routeShapes1,
              stopTimes: relevantStopTimes1,
              stops: relevantStops1,
              color: ROUTE_COLORS[0],
              allTripStopTimes: allTripStopTimes1,
              stopSequence: stopSequence1,
            });
          }

          // Second leg
          const route2 = routes.find(r => r.route_id === route2Id);
          const route2Trips = tripsByRoute[route2Id] || [];

          // Find a trip that serves both interchange and destination stops in the right order
          const validTripResult2 = findValidTrip(
            route2Trips,
            allStopTimes,
            interchangeStopIds,
            toStopIds
          );

          if (route2 && validTripResult2) {
            const { trip: validTrip2, fromIndex: interchangeIndex, toIndex } = validTripResult2;
            const tripStopTimes2 = allStopTimes
              .filter(st => st.trip_id === validTrip2.trip_id)
              .sort((a, b) => a.stop_sequence - b.stop_sequence);

            const relevantStopTimes2 = tripStopTimes2.slice(
              Math.max(0, interchangeIndex),
              toIndex + 1
            );

            const relevantStopIds2 = relevantStopTimes2.map(st => st.stop_id);
            const relevantStops2 = stops.filter(s => relevantStopIds2.includes(s.stop_id));

            const routeShapes2 = allShapes.filter(s => s.shape_id === validTrip2.shape_id);

            // Build timetable data for second leg
            const stopSequence2 = relevantStopIds2;
            const allTripStopTimes2 = buildTimetableData(
              route2Trips,
              allStopTimes,
              interchangeStopIds,
              toStopIds,
              stopSequence2
            );

            segments.push({
              routeId: route2.route_id,
              routeShortName: route2.route_short_name,
              shapes: routeShapes2,
              stopTimes: relevantStopTimes2,
              stops: relevantStops2,
              color: ROUTE_COLORS[1],
              allTripStopTimes: allTripStopTimes2,
              stopSequence: stopSequence2,
            });
          }
        }

        // Collect all stops for the map
        const allSegmentStops = segments.flatMap(s => s.stops);

        setData({
          type,
          fromStop,
          toStop,
          interchangeStop,
          segments,
          routes,
          allStops: allSegmentStops,
        });
      } catch (err) {
        console.error('Error fetching trip result data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trip details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-4">
          <div className="flex items-center gap-3">
            <Sidebar />
            <Navigation className="w-5 h-5 shrink-0" />
            <h1 className="font-semibold">Trip Details</h1>
          </div>
        </div>
        <div className="h-14" />
        <CircleLoaderBlock text="Loading trip details..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-4">
          <div className="flex items-center gap-3">
            <Sidebar />
            <Navigation className="w-5 h-5 shrink-0" />
            <h1 className="font-semibold">Trip Details</h1>
          </div>
        </div>
        <div className="h-14" />
        <div className="p-4 py-8 text-center">
          <p className="text-muted-foreground">{error || 'Trip not found'}</p>
          <Button asChild className="mt-4">
            <Link to="/plan">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Trip Planner
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-4">
        <div className="flex items-center gap-3">
          <Sidebar />
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 text-sm flex-col">
              <div className="flex items-center gap-1 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
                <span className="truncate">{data.fromStop.stop_name}</span>
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
                <span className="truncate">{data.toStop.stop_name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-14" />

      {/* Map - Full width, 70vh height */}
      <div className="h-[70vh]">
        <TripResultMap
          segments={data.segments}
          fromStop={data.fromStop}
          toStop={data.toStop}
          interchangeStop={data.interchangeStop}
          allStops={data.allStops}
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Start</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>End</span>
          </div>
          {data.interchangeStop && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Change</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-slate-400" />
            <span>Stop</span>
          </div>
        </div>

        {/* Route Summary */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            {data.type === 'direct' ? 'Direct Route' : 'Route with Interchange'}
          </h2>
          <div className="space-y-2">
            {data.segments.map((segment, index) => (
              <RouteSummarySegmentItem
                key={segment.routeId}
                segment={segment}
                interchangeStop={data.interchangeStop}
                showInterchangeBefore={index > 0 && !!data.interchangeStop}
              />
            ))}
          </div>
        </section>

        {/* Stops List with Timetable */}
        {data.segments.map(segment => (
          <SegmentStopsSection key={segment.routeId} segment={segment} data={data} />
        ))}

        {/* Back Button */}
        <Button asChild variant="outline" className="w-full">
          <Link to={`/plan?from=${data.fromStop.stop_id}&to=${data.toStop.stop_id}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Trip Planner
          </Link>
        </Button>
      </div>
    </div>
  );
}
