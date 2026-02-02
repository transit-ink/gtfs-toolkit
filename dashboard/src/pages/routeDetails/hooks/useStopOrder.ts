import { useCallback, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { reorderStopTimes } from '@/services/routes';
import { Stop } from '@/types/gtfs';
import { PendingStopChange, RouteDetails, ShapeInfo, TimetableData } from '../types';

// Calculate distance squared between two stops (for comparison purposes)
function distanceSquared(stop1: Stop, stop2: Stop): number {
  const lat1 = parseFloat(String(stop1.stop_lat));
  const lon1 = parseFloat(String(stop1.stop_lon));
  const lat2 = parseFloat(String(stop2.stop_lat));
  const lon2 = parseFloat(String(stop2.stop_lon));
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  return dLat * dLat + dLon * dLon;
}

// Find the closest stop from existing stops
function findClosestStop(
  newStop: Stop,
  existingStopIds: string[],
  stops: Stop[]
): string | null {
  if (existingStopIds.length === 0) return null;
  if (!newStop) return null;

  // Use the newStop directly - it already has coordinates
  let closestStopId: string | null = null;
  let closestDistance = Infinity;

  existingStopIds.forEach((stopId) => {
    const existingStop = stops.find((s) => s.stop_id === stopId);
    if (existingStop) {
      const dist = distanceSquared(newStop, existingStop);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestStopId = stopId;
      }
    }
  });

  return closestStopId;
}

interface UseStopOrderParams {
  selectedShapeId: string | null;
  selectedShapeInfo: ShapeInfo | undefined;
  details: RouteDetails | null;
  setDetails: React.Dispatch<React.SetStateAction<RouteDetails | null>>;
  pendingStopChanges: { [shapeId: string]: PendingStopChange[] };
  selectedServiceId: string | null;
}

export function useStopOrder({
  selectedShapeId,
  selectedShapeInfo,
  details,
  setDetails,
  pendingStopChanges,
  selectedServiceId,
}: UseStopOrderParams) {
  const [customStopOrder, setCustomStopOrder] = useState<{ [shapeId: string]: string[] }>({});
  const [isSavingStopOrder, setIsSavingStopOrder] = useState(false);
  const [stopOrderError, setStopOrderError] = useState<string | null>(null);

  // Build timetable data
  const timetableData = useMemo<TimetableData>(() => {
    if (!details || !selectedShapeInfo) return { trips: [], stopSequence: [] };

    const tripIds = selectedShapeInfo.tripIds.filter((tripId) => {
      if (!selectedServiceId) return true;
      const trip = details.trips.find((t) => t.trip_id === tripId);
      return trip?.service_id === selectedServiceId;
    });
    const originalStopSequence = selectedShapeInfo.stopTimes.map((st) => st.stop_id);

    // Use custom order if available for this shape, otherwise use original
    let stopSequence =
      selectedShapeId && customStopOrder[selectedShapeId]
        ? customStopOrder[selectedShapeId]
        : originalStopSequence;

    // Apply pending stop changes (add/remove)
    if (selectedShapeId && pendingStopChanges[selectedShapeId]) {
      const changes = pendingStopChanges[selectedShapeId];
      let modifiedSequence = [...stopSequence];
      
      console.log('Applying pending stop changes:', changes, 'to sequence:', modifiedSequence);
      
      changes.forEach((change) => {
        if (change.type === 'add' && !modifiedSequence.includes(change.stopId)) {
          // Find the closest existing stop and add after it
          if (!change.stop) {
            console.warn('Change missing stop object:', change);
            modifiedSequence.push(change.stopId);
            return;
          }
          
          if (!details.stops || details.stops.length === 0) {
            console.warn('No stops available in details');
            modifiedSequence.push(change.stopId);
            return;
          }
          
          const closestStopId = findClosestStop(change.stop, modifiedSequence, details.stops);
          console.log('Finding closest stop for:', change.stop.stop_id, 'closest:', closestStopId, 'sequence:', modifiedSequence);
          
          if (closestStopId) {
            const closestIndex = modifiedSequence.indexOf(closestStopId);
            if (closestIndex >= 0) {
              // Insert after the closest stop
              modifiedSequence.splice(closestIndex + 1, 0, change.stopId);
              console.log('Inserted stop after closest at index:', closestIndex + 1);
            } else {
              // Fallback: add at the end if closest stop not found
              console.warn('Closest stop ID not found in sequence');
              modifiedSequence.push(change.stopId);
            }
          } else {
            // Fallback: add at the end if no existing stops
            console.warn('No closest stop found');
            modifiedSequence.push(change.stopId);
          }
        } else if (change.type === 'remove') {
          // Remove stop from sequence
          modifiedSequence = modifiedSequence.filter((id) => id !== change.stopId);
        }
      });
      
      stopSequence = modifiedSequence;
    }

    const tripStopTimesMap: {
      [tripId: string]: { [stopId: string]: (typeof details.stopTimes)[0] };
    } = {};
    tripIds.forEach((tripId) => {
      tripStopTimesMap[tripId] = {};
      // Add existing stop times
      details.stopTimes
        .filter((st) => st.trip_id === tripId)
        .forEach((st) => {
          tripStopTimesMap[tripId][st.stop_id] = st;
        });
      
      // Add pending stop times (for stops that are being added)
      if (selectedShapeId && pendingStopChanges[selectedShapeId]) {
        pendingStopChanges[selectedShapeId].forEach((change) => {
          if (change.type === 'add' && change.tripTimes && change.tripTimes[tripId]) {
            const times = change.tripTimes[tripId];
            // Create a synthetic StopTime object for display
            tripStopTimesMap[tripId][change.stopId] = {
              trip_id: tripId,
              stop_id: change.stopId,
              arrival_time: times.arrivalTime,
              departure_time: times.departureTime,
              stop_sequence: stopSequence.indexOf(change.stopId) + 1,
            } as typeof details.stopTimes[0];
          }
        });
      }
    });

    const sortedTripIds = [...tripIds].sort((a, b) => {
      const firstStopId = stopSequence[0];
      const timeA = tripStopTimesMap[a]?.[firstStopId]?.departure_time || '';
      const timeB = tripStopTimesMap[b]?.[firstStopId]?.departure_time || '';
      return timeA.localeCompare(timeB);
    });

    return {
      trips: sortedTripIds.map((tripId) => ({
        tripId,
        stopTimes: tripStopTimesMap[tripId],
      })),
      stopSequence,
    };
  }, [
    details,
    selectedShapeInfo,
    selectedShapeId,
    customStopOrder,
    pendingStopChanges,
    selectedServiceId,
  ]);

  // Check if there are unsaved stop order changes for the current shape
  const hasUnsavedStopOrderChanges = useMemo(() => {
    if (!selectedShapeId) return false;
    return Object.prototype.hasOwnProperty.call(customStopOrder, selectedShapeId);
  }, [selectedShapeId, customStopOrder]);

  // Handle stop reordering
  const handleReorderStops = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!selectedShapeId) return;

      const currentSequence = timetableData.stopSequence;
      const newSequence = [...currentSequence];
      const [movedItem] = newSequence.splice(fromIndex, 1);
      newSequence.splice(toIndex, 0, movedItem);

      setCustomStopOrder((prev) => ({
        ...prev,
        [selectedShapeId]: newSequence,
      }));
      setStopOrderError(null);
    },
    [selectedShapeId, timetableData.stopSequence]
  );

  // Save stop order changes
  const handleSaveStopOrder = useCallback(async () => {
    if (!selectedShapeId || !selectedShapeInfo || !hasUnsavedStopOrderChanges) return;

    const newStopSequence = customStopOrder[selectedShapeId];
    if (!newStopSequence) return;

    setIsSavingStopOrder(true);
    setStopOrderError(null);

    try {
      // Create the stop sequence with new order numbers
      const stopSequenceData = newStopSequence.map((stopId, index) => ({
        stopId,
        sequence: index + 1,
      }));

      // Get all trip IDs for this shape
      const tripIds = selectedShapeInfo.tripIds;

      await reorderStopTimes(tripIds, stopSequenceData);

      // Update the local details to reflect the new order
      if (details) {
        const updatedStopTimes = details.stopTimes.map((st) => {
          if (tripIds.includes(st.trip_id)) {
            const newSeq = stopSequenceData.find((s) => s.stopId === st.stop_id);
            if (newSeq) {
              return { ...st, stop_sequence: newSeq.sequence };
            }
          }
          return st;
        });
        setDetails({ ...details, stopTimes: updatedStopTimes });
      }

      // Clear the custom order for this shape since it's now saved
      setCustomStopOrder((prev) => {
        const newOrder = { ...prev };
        delete newOrder[selectedShapeId];
        return newOrder;
      });
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 403) {
          setStopOrderError('Permission denied: You need admin privileges to reorder stops.');
        } else {
          setStopOrderError(err.response?.data?.message || 'Failed to save stop order');
        }
      } else {
        setStopOrderError('An unexpected error occurred');
      }
    } finally {
      setIsSavingStopOrder(false);
    }
  }, [selectedShapeId, selectedShapeInfo, hasUnsavedStopOrderChanges, customStopOrder, details, setDetails]);

  // Discard stop order changes
  const handleDiscardStopOrderChanges = useCallback(() => {
    if (!selectedShapeId) return;

    setCustomStopOrder((prev) => {
      const newOrder = { ...prev };
      delete newOrder[selectedShapeId];
      return newOrder;
    });
    setStopOrderError(null);
  }, [selectedShapeId]);

  return {
    timetableData,
    hasUnsavedStopOrderChanges,
    isSavingStopOrder,
    stopOrderError,
    handleReorderStops,
    handleSaveStopOrder,
    handleDiscardStopOrderChanges,
  };
}
