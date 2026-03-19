import { BulkUpdateStopTime, bulkUpdateStopTimes } from '@/services/routes';
import { StopTime } from '@/types/gtfs';
import { AxiosError } from 'axios';
import { useCallback, useMemo, useState } from 'react';
import { RouteDetails, TimetableData } from '../types';

interface UseTripTimeEditParams {
  selectedShapeId: string | null;
  details: RouteDetails | null;
  timetableData: TimetableData;
  refreshTripsAndStops: () => Promise<void>;
  routeId?: string;
}

export interface TripTimeChange {
  tripId: string;
  stopId: string;
  arrivalTime: string;
  departureTime: string;
}

export function useTripTimeEdit({
  selectedShapeId,
  details,
  timetableData,
  refreshTripsAndStops,
  routeId,
}: UseTripTimeEditParams) {
  const [tripTimeChanges, setTripTimeChanges] = useState<{
    [key: string]: TripTimeChange;
  }>({});
  const [isSavingTripTimes, setIsSavingTripTimes] = useState(false);
  const [tripTimesError, setTripTimesError] = useState<string | null>(null);

  // Get current stop time for a trip and stop
  const getStopTime = useCallback(
    (tripId: string, stopId: string): StopTime | undefined => {
      if (!details) return undefined;
      return details.stopTimes.find(st => st.trip_id === tripId && st.stop_id === stopId);
    },
    [details]
  );

  // Get display time (from changes or original)
  const getDisplayTime = useCallback(
    (tripId: string, stopId: string, type: 'arrival' | 'departure'): string => {
      const key = `${tripId}-${stopId}`;
      const change = tripTimeChanges[key];
      if (change) {
        return type === 'arrival' ? change.arrivalTime : change.departureTime;
      }
      const stopTime = getStopTime(tripId, stopId);
      if (stopTime) {
        const time = type === 'arrival' ? stopTime.arrival_time : stopTime.departure_time;
        return time || '';
      }
      return '';
    },
    [tripTimeChanges, getStopTime]
  );

  // Update a single trip time
  const updateTripTime = useCallback(
    (tripId: string, stopId: string, arrivalTime: string, departureTime: string) => {
      const key = `${tripId}-${stopId}`;
      setTripTimeChanges(prev => ({
        ...prev,
        [key]: {
          tripId,
          stopId,
          arrivalTime,
          departureTime,
        },
      }));
    },
    []
  );

  // Add or subtract minutes from a time string
  const adjustTime = useCallback((timeStr: string, minutes: number): string => {
    if (!timeStr || timeStr === '00:00:00') return '00:00:00';

    const parts = timeStr.split(':');
    if (parts.length !== 3) return timeStr;

    let hours = parseInt(parts[0], 10);
    let mins = parseInt(parts[1], 10);
    let seconds = parseInt(parts[2], 10);

    // Convert to total minutes, adjust, then convert back
    const totalMinutes = hours * 60 + mins + minutes;
    const newTotalMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);

    hours = Math.floor(newTotalMinutes / 60);
    mins = newTotalMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  // Adjust time for entire row (all trips for a stop)
  const adjustRowTime = useCallback(
    (stopId: string, minutes: number) => {
      if (!details) return;

      setTripTimeChanges(prev => {
        const updates: { [key: string]: TripTimeChange } = {};

        timetableData.trips.forEach(trip => {
          const key = `${trip.tripId}-${stopId}`;

          // Get current time from pending changes or original
          const existingChange = prev[key];
          let currentArrival: string;
          let currentDeparture: string;

          if (existingChange) {
            currentArrival = existingChange.arrivalTime;
            currentDeparture = existingChange.departureTime;
          } else {
            const stopTime = details.stopTimes.find(
              st => st.trip_id === trip.tripId && st.stop_id === stopId
            );
            currentArrival = stopTime?.arrival_time || '';
            currentDeparture = stopTime?.departure_time || '';
          }

          if (currentArrival || currentDeparture) {
            const newArrival = currentArrival ? adjustTime(currentArrival, minutes) : '';
            const newDeparture = currentDeparture ? adjustTime(currentDeparture, minutes) : '';

            updates[key] = {
              tripId: trip.tripId,
              stopId,
              arrivalTime: newArrival,
              departureTime: newDeparture,
            };
          }
        });

        // Only update if we have changes
        if (Object.keys(updates).length === 0) return prev;

        return {
          ...prev,
          ...updates,
        };
      });
    },
    [timetableData, details, adjustTime]
  );

  // Adjust time for entire column (all stops for a trip)
  const adjustColumnTime = useCallback(
    (tripId: string, minutes: number) => {
      if (!details) return;

      setTripTimeChanges(prev => {
        const updates: { [key: string]: TripTimeChange } = {};

        timetableData.stopSequence.forEach(stopId => {
          const key = `${tripId}-${stopId}`;

          // Get current time from pending changes or original
          const existingChange = prev[key];
          let currentArrival: string;
          let currentDeparture: string;

          if (existingChange) {
            currentArrival = existingChange.arrivalTime;
            currentDeparture = existingChange.departureTime;
          } else {
            const stopTime = details.stopTimes.find(
              st => st.trip_id === tripId && st.stop_id === stopId
            );
            currentArrival = stopTime?.arrival_time || '';
            currentDeparture = stopTime?.departure_time || '';
          }

          if (currentArrival || currentDeparture) {
            const newArrival = currentArrival ? adjustTime(currentArrival, minutes) : '';
            const newDeparture = currentDeparture ? adjustTime(currentDeparture, minutes) : '';

            updates[key] = {
              tripId,
              stopId,
              arrivalTime: newArrival,
              departureTime: newDeparture,
            };
          }
        });

        // Only update if we have changes
        if (Object.keys(updates).length === 0) return prev;

        return {
          ...prev,
          ...updates,
        };
      });
    },
    [timetableData, details, adjustTime]
  );

  // Check if there are unsaved trip time changes
  const hasUnsavedTripTimeChanges = useMemo(() => {
    const hasChanges = Object.keys(tripTimeChanges).length > 0;
    return hasChanges;
  }, [tripTimeChanges]);

  // Save trip time changes
  const handleSaveTripTimes = useCallback(async () => {
    if (!selectedShapeId || !hasUnsavedTripTimeChanges) return;

    setIsSavingTripTimes(true);
    setTripTimesError(null);

    try {
      const updates: BulkUpdateStopTime[] = Object.values(tripTimeChanges).map(change => ({
        tripId: change.tripId,
        stopId: change.stopId,
        arrivalTime: change.arrivalTime,
        departureTime: change.departureTime,
      }));

      await bulkUpdateStopTimes(updates, routeId);

      // Refresh route details to get updated stop times
      await refreshTripsAndStops();

      // Clear trip time changes
      setTripTimeChanges({});
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 403) {
          setTripTimesError('Permission denied: You need admin privileges to edit trip times.');
        } else {
          setTripTimesError(err.response?.data?.message || 'Failed to save trip time changes');
        }
      } else {
        setTripTimesError('An unexpected error occurred');
      }
    } finally {
      setIsSavingTripTimes(false);
    }
  }, [selectedShapeId, hasUnsavedTripTimeChanges, tripTimeChanges, refreshTripsAndStops, routeId]);

  // Discard trip time changes
  const handleDiscardTripTimes = useCallback(() => {
    setTripTimeChanges({});
    setTripTimesError(null);
  }, []);

  return {
    tripTimeChanges,
    isSavingTripTimes,
    tripTimesError,
    hasUnsavedTripTimeChanges,
    getDisplayTime,
    updateTripTime,
    adjustRowTime,
    adjustColumnTime,
    handleSaveTripTimes,
    handleDiscardTripTimes,
  };
}
