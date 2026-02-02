import {
  getCalendarsBulk,
  getRoute,
  getShapesBulk,
  getStopsBulk,
  getStopTimes,
  getTripsForRoute,
} from '@/services/routes';
import { Calendar } from '@/types/calendar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EditFormState, RouteDetails, ShapeInfo } from '../types';

export function useRouteDetails(routeId: string | undefined) {
  const [details, setDetails] = useState<RouteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);

  // Edit form state (initialized from route details)
  const [editForm, setEditForm] = useState<EditFormState>({
    route_id: '',
    route_short_name: '',
    route_long_name: '',
    route_type: 3, // Default to Bus
  });

  // Fetch route details
  useEffect(() => {
    if (!routeId) return;

    const fetchRouteDetails = async () => {
      setLoading(true);
      setError(null);
      setSelectedShapeId(null);

      try {
        const route = await getRoute(routeId);
        const trips = await getTripsForRoute(routeId);

        const shapeIds = [...new Set(trips.map((t) => t.shape_id).filter(Boolean))] as string[];
        const tripIds = trips.map((t) => t.trip_id);
        const serviceIds = [
          ...new Set(trips.map((t) => t.service_id).filter(Boolean)),
        ] as string[];

        const [shapes, stopTimes, calendarsData] = await Promise.all([
          getShapesBulk(shapeIds),
          getStopTimes(tripIds),
          getCalendarsBulk(serviceIds),
        ]);

        const stopIds = [...new Set(stopTimes.map((st) => st.stop_id))];
        const stops = await getStopsBulk(stopIds);

        setDetails({ route, trips, shapes, stopTimes, stops });
        setCalendars(calendarsData);

        // Initialize edit form
        setEditForm({
          route_id: route.route_id || '',
          route_short_name: route.route_short_name || '',
          route_long_name: route.route_long_name || '',
          route_type: route.route_type,
        });
      } catch (err) {
        console.error('Error fetching route details:', err);
        setError('Failed to load route details');
      } finally {
        setLoading(false);
      }
    };

    fetchRouteDetails();
  }, [routeId]);

  // Get shape info with first/last stops for each direction
  const shapeInfos = useMemo<ShapeInfo[]>(() => {
    if (!details) return [];

    const tripsByShape: { [shapeId: string]: typeof details.trips } = {};
    details.trips.forEach((trip) => {
      if (trip.shape_id) {
        if (!tripsByShape[trip.shape_id]) {
          tripsByShape[trip.shape_id] = [];
        }
        tripsByShape[trip.shape_id].push(trip);
      }
    });

    // If there are no shapes for this route but we still have trips,
    // create a synthetic "default" group so that timetable information
    // can still be displayed based on the trips/stop times.
    if (Object.keys(tripsByShape).length === 0 && details.trips.length > 0) {
      const representativeTrip = details.trips[0];
      const stopTimes = details.stopTimes
        .filter((st) => st.trip_id === representativeTrip.trip_id)
        .sort((a, b) => a.stop_sequence - b.stop_sequence);

      const firstStopId = stopTimes[0]?.stop_id;
      const lastStopId = stopTimes[stopTimes.length - 1]?.stop_id;

      return [
        {
          shapeId: 'default',
          tripId: representativeTrip.trip_id,
          tripIds: details.trips.map((t) => t.trip_id),
          stopTimes,
          firstStop: details.stops.find((s) => s.stop_id === firstStopId),
          lastStop: details.stops.find((s) => s.stop_id === lastStopId),
        },
      ];
    }

    return Object.entries(tripsByShape).map(([shapeId, trips]) => {
      const representativeTrip = trips[0];
      const stopTimes = details.stopTimes
        .filter((st) => st.trip_id === representativeTrip.trip_id)
        .sort((a, b) => a.stop_sequence - b.stop_sequence);

      const firstStopId = stopTimes[0]?.stop_id;
      const lastStopId = stopTimes[stopTimes.length - 1]?.stop_id;

      return {
        shapeId,
        tripId: representativeTrip.trip_id,
        tripIds: trips.map((t) => t.trip_id),
        stopTimes,
        firstStop: details.stops.find((s) => s.stop_id === firstStopId),
        lastStop: details.stops.find((s) => s.stop_id === lastStopId),
      };
    });
  }, [details]);

  // Set initial selected shape
  useEffect(() => {
    if (shapeInfos.length > 0 && !selectedShapeId) {
      setSelectedShapeId(shapeInfos[0].shapeId);
    }
  }, [shapeInfos, selectedShapeId]);

  const selectedShapeInfo = useMemo(() => {
    return shapeInfos.find((info) => info.shapeId === selectedShapeId);
  }, [shapeInfos, selectedShapeId]);

  // Refresh trips and stops (used after stop changes)
  const refreshTripsAndStops = useCallback(async () => {
    if (!routeId) return;

    const trips = await getTripsForRoute(routeId);
    const tripIdsAll = trips.map((t) => t.trip_id);
    const stopTimes = await getStopTimes(tripIdsAll);
    const stopIds = [...new Set(stopTimes.map((st) => st.stop_id))];
    const stops = await getStopsBulk(stopIds);

    setDetails((prev) => (prev ? { ...prev, trips, stopTimes, stops } : null));
  }, [routeId]);

  return {
    details,
    setDetails,
    loading,
    error,
    selectedShapeId,
    setSelectedShapeId,
    shapeInfos,
    selectedShapeInfo,
    editForm,
    setEditForm,
    refreshTripsAndStops,
    calendars,
  };
}
