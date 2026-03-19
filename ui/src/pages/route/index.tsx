import { Button } from '@/components/ui/button';
import { Bus, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CircleLoaderBlock } from '../../components/circleLoader';
import RouteMap from '../../components/routeMap';
import { RouteContributors } from '../../components/RouteContributors';
import Sidebar from '../../components/sidebar';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Calendar, Route, Shape, Stop, StopTime, Trip } from '../../types/gtfs';
import { useRouteDetails } from '../../utils/api';
import { MAX_HISTORY_LENGTH, SEARCH_RESULT_TYPES } from '../../utils/constants';
import RouteDirectionSelector from './directionSelector';
import RouteServiceSelector from './serviceSelector';
import RouteStopsOnRoute from './stopsOnRoute';
import { getShapeInfos } from './utils';

interface RouteDetails {
  route: Route;
  trips: Trip[];
  shapes: Shape[];
  stopTimes: StopTime[];
  stops: Stop[];
}

export default function RoutePage() {
  const params = useParams();
  const routeId = (params['*'] as string | undefined) || undefined;
  const { data: routeData, isPending: loading } = useRouteDetails(routeId);

  const details: RouteDetails | null = routeData
    ? {
        route: routeData.route,
        trips: routeData.trips,
        shapes: routeData.shapes,
        stopTimes: routeData.stopTimes,
        stops: routeData.stops,
      }
    : null;
  const calendars: Calendar[] = routeData?.calendars ?? [];

  // Trips with at least two stop timings (exclude invalid/short trips)
  const validTrips = useMemo(() => {
    if (!details) return [];
    return details.trips.filter(trip => {
      const count = details.stopTimes.filter(st => st.trip_id === trip.trip_id).length;
      return count >= 2;
    });
  }, [details]);

  const [isFavourited, setIsFavourited] = useState(false);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  // Reset shape/service when route changes
  useEffect(() => {
    setSelectedShapeId(null);
    setSelectedServiceId(null);
  }, [routeId]);

  // Sync favourited from localStorage when details load
  useEffect(() => {
    if (!details?.route) return;
    const favourites = JSON.parse(localStorage.getItem('bpt_favourites') || '[]');
    setIsFavourited(
      favourites.some(
        (f: { type: string; id: string }) =>
          f.type === SEARCH_RESULT_TYPES.bus_number && f.id === details.route.route_id
      )
    );
  }, [details?.route?.route_id]);

  // Update history when route details load
  useEffect(() => {
    if (!details?.route) return;
    const route = details.route;
    const historyItems = JSON.parse(localStorage.getItem('bpt_history') || '[]');
    const newHistoryItem = {
      id: route.route_id,
      text: route.route_long_name
        ? `${route.route_short_name} - ${route.route_long_name}`
        : route.route_short_name,
      type: SEARCH_RESULT_TYPES.bus_number,
    };
    const newHistory = [
      newHistoryItem,
      ...historyItems.filter(
        (h: { id: string; type: string }) =>
          !(h.id === route.route_id && h.type === SEARCH_RESULT_TYPES.bus_number)
      ),
    ].slice(0, MAX_HISTORY_LENGTH);
    localStorage.setItem('bpt_history', JSON.stringify(newHistory));
  }, [details?.route?.route_id]);

  // Default selected service when data loads
  useEffect(() => {
    if (!validTrips.length || selectedServiceId) return;
    const tripsByService: Record<string, number> = {};
    validTrips.forEach(trip => {
      if (!trip.service_id) return;
      tripsByService[trip.service_id] = (tripsByService[trip.service_id] || 0) + 1;
    });
    const serviceIdsWithTrips = Object.entries(tripsByService)
      .filter(([, count]) => count > 0)
      .map(([serviceId]) => serviceId);
    if (serviceIdsWithTrips.length > 0) {
      const defaultServiceId = serviceIdsWithTrips.reduce((best, current) => {
        const bestCount = tripsByService[best] ?? 0;
        const currentCount = tripsByService[current] ?? 0;
        return currentCount > bestCount ? current : best;
      }, serviceIdsWithTrips[0]);
      setSelectedServiceId(defaultServiceId);
    }
  }, [validTrips, selectedServiceId]);

  usePageMeta({
    title: details ? `${details.route.route_short_name} Route` : `${routeId} Route`,
    description: details
      ? `${details.route.route_short_name} - ${details.route.route_long_name}. View all stops and route map.`
      : 'View bus route details, stops, and route map.',
  });

  const shapeInfos = useMemo(
    () =>
      getShapeInfos(
        details
          ? { route: details.route, stopTimes: details.stopTimes, stops: details.stops }
          : null,
        validTrips
      ),
    [details, validTrips]
  );

  // Set initial selected shape when data loads
  useEffect(() => {
    if (shapeInfos.length > 0 && !selectedShapeId) {
      setSelectedShapeId(shapeInfos[0].shapeId);
    }
  }, [shapeInfos, selectedShapeId]);

  // Get selected shape info
  const selectedShapeInfo = useMemo(() => {
    return shapeInfos.find(info => info.shapeId === selectedShapeId);
  }, [shapeInfos, selectedShapeId]);

  // Build timetable data for selected shape
  const timetableData = useMemo(() => {
    if (!details || !selectedShapeInfo) return { trips: [], stopSequence: [] };

    // Filter trips by selected service, if any
    const tripIds = selectedShapeInfo.tripIds.filter(tripId => {
      if (!selectedServiceId) return true;
      const trip = validTrips.find(t => t.trip_id === tripId);
      return trip?.service_id === selectedServiceId;
    });

    // Get stop sequence from the representative trip's stop times
    const stopSequence = selectedShapeInfo.stopTimes.map(st => st.stop_id);

    // Get all stop times for trips of this shape, grouped by trip
    const tripStopTimesMap: { [tripId: string]: { [stopId: string]: StopTime } } = {};

    tripIds.forEach(tripId => {
      tripStopTimesMap[tripId] = {};
      details.stopTimes
        .filter(st => st.trip_id === tripId)
        .forEach(st => {
          tripStopTimesMap[tripId][st.stop_id] = st;
        });
    });

    // Sort trips by the time at the first stop where BOTH trips have timings.
    // This means that for any two trips that share a stop, their relative
    // order is decided by the timing at that shared stop (not necessarily
    // the first stop in the route or the first stop they individually serve).
    const sortedTripIds = [...tripIds].sort((a, b) => {
      for (const stopId of stopSequence) {
        const stA = tripStopTimesMap[a]?.[stopId];
        const stB = tripStopTimesMap[b]?.[stopId];

        if (!stA || !stB) {
          // If either trip doesn't serve this stop, move on to the next one
          continue;
        }

        const timeA = stA.departure_time || stA.arrival_time || '';
        const timeB = stB.departure_time || stB.arrival_time || '';

        if (timeA !== timeB) {
          return timeA.localeCompare(timeB);
        }
      }

      // If we never found a common stop with differing times, keep original order
      return 0;
    });

    return {
      trips: sortedTripIds.map(tripId => ({
        tripId,
        stopTimes: tripStopTimesMap[tripId],
      })),
      stopSequence,
    };
  }, [details, validTrips, selectedShapeInfo, selectedServiceId]);

  // Build service options (hide services with 0 trips)
  const serviceOptions = useMemo(() => {
    if (!details) return [];

    const tripsByService: { [serviceId: string]: number } = {};
    validTrips.forEach(trip => {
      if (!trip.service_id) return;
      tripsByService[trip.service_id] = (tripsByService[trip.service_id] || 0) + 1;
    });

    return Object.entries(tripsByService)
      .filter(([, count]) => count > 0)
      .map(([serviceId, count]) => ({
        serviceId,
        tripsCount: count,
        calendar: calendars.find(c => c.service_id === serviceId),
      }))
      .sort((a, b) => b.tripsCount - a.tripsCount);
  }, [details, validTrips, calendars]);

  // Ensure a service is selected when options change
  useEffect(() => {
    if (!selectedServiceId && serviceOptions.length > 0) {
      setSelectedServiceId(serviceOptions[0].serviceId);
    }
  }, [serviceOptions, selectedServiceId]);

  const toggleFavourite = () => {
    if (!details) return;

    const currentFavourites = JSON.parse(localStorage.getItem('bpt_favourites') || '[]');
    let newFavourites = [];

    if (isFavourited) {
      newFavourites = currentFavourites.filter(
        (f: any) => !(f.type === SEARCH_RESULT_TYPES.bus_number && f.id === details.route.route_id)
      );
    } else {
      newFavourites = [
        {
          id: details.route.route_id,
          text: details.route.route_short_name,
          type: SEARCH_RESULT_TYPES.bus_number,
        },
        ...currentFavourites,
      ];
    }

    setIsFavourited(!isFavourited);
    localStorage.setItem('bpt_favourites', JSON.stringify(newFavourites));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CircleLoaderBlock text="Loading route..." />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-2 bg-primary text-primary-foreground p-4">
          <Sidebar />
          <h1 className="text-lg font-semibold">Route</h1>
        </div>
        <div className="p-4 text-center text-muted-foreground">Route not found</div>
      </div>
    );
  }

  // Get stops for currently selected shape
  const tripStopTimes = selectedShapeInfo?.stopTimes || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-4">
        <div className="flex items-center gap-3">
          <Sidebar />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Bus className="w-5 h-5 shrink-0" />
              <h1 className="text-lg font-bold">{details.route.route_short_name}</h1>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/80 text-xs">
              {details.route.route_long_name && (
                <span className="truncate">{details.route.route_long_name}</span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={toggleFavourite}>
            <Star className={`w-5 h-5 ${isFavourited ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-14" />

      {/* Map - Full width, 70vh height */}
      <div className="h-[70vh]">
        <RouteMap
          shapes={details.shapes}
          stops={details.stops}
          stopTimes={tripStopTimes}
          selectedShapeId={selectedShapeId || undefined}
          allShapeIds={shapeInfos.map(info => info.shapeId)}
          onShapeSelect={setSelectedShapeId}
          routeColor={details.route.route_color}
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Service selector (by service_id) */}
        {serviceOptions.length > 1 && (
          <RouteServiceSelector
            services={serviceOptions}
            selectedServiceId={selectedServiceId}
            onSelectService={setSelectedServiceId}
          />
        )}

        {/* Direction selector */}
        {shapeInfos.length > 1 && (
          <RouteDirectionSelector
            shapeInfos={shapeInfos}
            selectedShapeId={selectedShapeId}
            onSelectShape={setSelectedShapeId}
          />
        )}

        {/* Stops on route + trip columns */}
        <RouteStopsOnRoute
          timetableData={timetableData}
          stops={details.stops}
          routeColor={details.route.route_color}
        />

        {/* Contributors section */}
        {routeId && <RouteContributors routeId={routeId} />}
      </div>
    </div>
  );
}
