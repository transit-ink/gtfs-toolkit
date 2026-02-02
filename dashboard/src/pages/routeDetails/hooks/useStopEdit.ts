import { addStopToTrips, removeStopFromTrips, reorderStopTimes } from '@/services/routes';
import { getStopsInBounds } from '@/services/stops';
import { Stop } from '@/types/gtfs';
import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PendingStopChange, RouteDetails, ShapeInfo, StopEditMode } from '../types';

interface UseStopEditParams {
  selectedShapeId: string | null;
  selectedShapeInfo: ShapeInfo | undefined;
  details: RouteDetails | null;
  refreshTripsAndStops: () => Promise<void>;
}

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

// Add 1 minute to a time string (HH:MM:SS format)
function addOneMinute(timeStr: string): string {
  if (!timeStr || timeStr === '00:00:00') return '00:01:00';
  
  const parts = timeStr.split(':');
  if (parts.length !== 3) return '00:01:00';
  
  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1], 10);
  let seconds = parseInt(parts[2], 10);
  
  minutes += 1;
  if (minutes >= 60) {
    minutes = 0;
    hours += 1;
    if (hours >= 24) {
      hours = 0;
    }
  }
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function useStopEdit({
  selectedShapeId,
  selectedShapeInfo,
  details,
  refreshTripsAndStops,
}: UseStopEditParams) {
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [isLoadingAllStops, setIsLoadingAllStops] = useState(false);
  const [stopEditMode, setStopEditMode] = useState<StopEditMode>('none');
  const [pendingStopChanges, setPendingStopChanges] = useState<{
    [shapeId: string]: PendingStopChange[];
  }>({});
  const [isSavingStops, setIsSavingStops] = useState(false);
  const [stopsError, setStopsError] = useState<string | null>(null);
  const [stopToRemove, setStopToRemove] = useState<Stop | null>(null);
  const [removeStopDialogOpen, setRemoveStopDialogOpen] = useState(false);

  // Refs to track current state for marker click handlers (to avoid stale closures)
  const stopEditModeRef = useRef<StopEditMode>('none');
  const selectedShapeIdRef = useRef<string | null>(null);
  const pendingStopChangesRef = useRef<{ [shapeId: string]: PendingStopChange[] }>({});

  // Keep refs in sync with state
  useEffect(() => {
    stopEditModeRef.current = stopEditMode;
  }, [stopEditMode]);

  useEffect(() => {
    selectedShapeIdRef.current = selectedShapeId;
  }, [selectedShapeId]);

  useEffect(() => {
    pendingStopChangesRef.current = pendingStopChanges;
  }, [pendingStopChanges]);

  // Check if there are unsaved stop changes for the current shape
  const hasUnsavedStopChanges = useMemo(() => {
    if (!selectedShapeId) return false;
    const changes = pendingStopChanges[selectedShapeId];
    return changes && changes.length > 0;
  }, [selectedShapeId, pendingStopChanges]);

  // Get the current stop IDs for selected shape (including pending changes)
  const getCurrentStopIds = useCallback(
    (shapeId: string): string[] => {
      if (!selectedShapeInfo) return [];

      const originalStopIds = selectedShapeInfo.stopTimes.map((st) => st.stop_id);
      const changes = pendingStopChanges[shapeId] || [];

      let stopIds = [...originalStopIds];
      changes.forEach((change) => {
        if (change.type === 'add' && !stopIds.includes(change.stopId)) {
          stopIds.push(change.stopId);
        } else if (change.type === 'remove') {
          stopIds = stopIds.filter((id) => id !== change.stopId);
        }
      });

      return stopIds;
    },
    [selectedShapeInfo, pendingStopChanges]
  );

  // Create a ref for getCurrentStopIds
  const getCurrentStopIdsRef = useRef(getCurrentStopIds);
  useEffect(() => {
    getCurrentStopIdsRef.current = getCurrentStopIds;
  }, [getCurrentStopIds]);

  // Toggle stop editing mode
  const handleToggleStopEdit = useCallback(() => {
    setStopEditMode((prev) => (prev === 'none' ? 'add' : 'none'));
    setStopsError(null);
  }, []);

  // Add stop to route (pending change)
  const handleAddStopToRoute = useCallback(
    (stop: Stop) => {
      if (!selectedShapeId || !selectedShapeInfo || !details) return;

      const currentStopIds = getCurrentStopIds(selectedShapeId);
      if (currentStopIds.includes(stop.stop_id)) {
        setStopsError('Stop is already part of this route');
        return;
      }

      // Calculate times immediately for all trips
      const existingStopIds = selectedShapeInfo.stopTimes.map((st) => st.stop_id);
      const closestStopId = findClosestStop(stop, existingStopIds, details.stops);
      const tripIds = selectedShapeInfo.tripIds;
      const tripTimes: { [tripId: string]: { arrivalTime: string; departureTime: string } } = {};

      tripIds.forEach((tripId) => {
        // Get all stop times for this trip, sorted by sequence
        const tripStopTimes = details.stopTimes
          .filter((st) => st.trip_id === tripId)
          .sort((a, b) => a.stop_sequence - b.stop_sequence);

        let calculatedTime = '00:01:00'; // Default fallback

        if (closestStopId) {
          // Find the closest stop's time
          const closestStopTime = tripStopTimes.find((st) => st.stop_id === closestStopId);

          if (closestStopTime && closestStopTime.departure_time && closestStopTime.departure_time.trim() !== '') {
            calculatedTime = addOneMinute(closestStopTime.departure_time);
          } else {
            // Fallback: find the stop that comes before the closest stop in sequence
            const closestIndex = tripStopTimes.findIndex((st) => st.stop_id === closestStopId);
            if (closestIndex > 0) {
              const previousStopTime = tripStopTimes[closestIndex - 1];
              if (previousStopTime && previousStopTime.departure_time && previousStopTime.departure_time.trim() !== '') {
                calculatedTime = addOneMinute(previousStopTime.departure_time);
              } else if (tripStopTimes[0]?.departure_time) {
                calculatedTime = addOneMinute(tripStopTimes[0].departure_time);
              }
            } else if (tripStopTimes[0]?.departure_time) {
              calculatedTime = addOneMinute(tripStopTimes[0].departure_time);
            }
          }
        } else if (tripStopTimes[0]?.departure_time) {
          calculatedTime = addOneMinute(tripStopTimes[0].departure_time);
        }

        tripTimes[tripId] = {
          arrivalTime: calculatedTime,
          departureTime: calculatedTime,
        };
      });

      setPendingStopChanges((prev) => {
        const currentChanges = prev[selectedShapeId] || [];
        // Remove any existing change for this stop
        const filteredChanges = currentChanges.filter((c) => c.stopId !== stop.stop_id);
        return {
          ...prev,
          [selectedShapeId]: [
            ...filteredChanges,
            { type: 'add', stopId: stop.stop_id, stop, tripTimes },
          ],
        };
      });
      setStopsError(null);
    },
    [selectedShapeId, selectedShapeInfo, details, getCurrentStopIds]
  );

  // Create a ref for handleAddStopToRoute
  const handleAddStopToRouteRef = useRef(handleAddStopToRoute);
  useEffect(() => {
    handleAddStopToRouteRef.current = handleAddStopToRoute;
  }, [handleAddStopToRoute]);

  // Remove stop from route (show confirmation dialog)
  const handleRemoveStopClick = useCallback((stop: Stop) => {
    setStopToRemove(stop);
    setRemoveStopDialogOpen(true);
  }, []);

  // Create a ref for handleRemoveStopClick
  const handleRemoveStopClickRef = useRef(handleRemoveStopClick);
  useEffect(() => {
    handleRemoveStopClickRef.current = handleRemoveStopClick;
  }, [handleRemoveStopClick]);

  // Confirm remove stop (pending change)
  const handleConfirmRemoveStop = useCallback(() => {
    if (!selectedShapeId || !stopToRemove) return;

    setPendingStopChanges((prev) => {
      const currentChanges = prev[selectedShapeId] || [];
      // Remove any existing change for this stop
      const filteredChanges = currentChanges.filter((c) => c.stopId !== stopToRemove.stop_id);
      return {
        ...prev,
        [selectedShapeId]: [
          ...filteredChanges,
          { type: 'remove', stopId: stopToRemove.stop_id, stop: stopToRemove },
        ],
      };
    });
    setRemoveStopDialogOpen(false);
    setStopToRemove(null);
    setStopsError(null);
  }, [selectedShapeId, stopToRemove]);

  // Save stop changes
  const handleSaveStopChanges = useCallback(async () => {
    console.log('=== handleSaveStopChanges CALLED ===');
    console.log('handleSaveStopChanges called', {
      selectedShapeId,
      hasUnsavedStopChanges,
      selectedShapeInfo: !!selectedShapeInfo,
      pendingStopChanges: pendingStopChanges[selectedShapeId || ''],
      allPendingChanges: pendingStopChanges
    });
    
    if (!selectedShapeId) {
      console.log('Early return: no selectedShapeId');
      return;
    }
    
    if (!hasUnsavedStopChanges) {
      console.log('Early return: no unsaved changes');
      return;
    }
    
    if (!selectedShapeInfo) {
      console.log('Early return: no selectedShapeInfo');
      return;
    }

    const changes = pendingStopChanges[selectedShapeId];
    if (!changes || changes.length === 0) {
      console.log('No changes to save');
      return;
    }

    setIsSavingStops(true);
    setStopsError(null);

    try {
      const tripIds = selectedShapeInfo.tripIds;

      console.log('Saving stop changes:', changes, 'tripIds:', tripIds, 'tripIds length:', tripIds?.length);
      
      // Build the final stop sequence (with new stops in correct order)
      const originalStopSequence = selectedShapeInfo.stopTimes.map((st) => st.stop_id);
      let finalStopSequence = [...originalStopSequence];
      
      // Apply pending changes to build the final sequence
      changes.forEach((change) => {
        if (change.type === 'add' && !finalStopSequence.includes(change.stopId)) {
          // Find the closest existing stop and add after it
          const closestStopId = findClosestStop(change.stop, finalStopSequence, details?.stops || []);
          if (closestStopId) {
            const closestIndex = finalStopSequence.indexOf(closestStopId);
            if (closestIndex >= 0) {
              finalStopSequence.splice(closestIndex + 1, 0, change.stopId);
            } else {
              finalStopSequence.push(change.stopId);
            }
          } else {
            finalStopSequence.push(change.stopId);
          }
        } else if (change.type === 'remove') {
          finalStopSequence = finalStopSequence.filter((id) => id !== change.stopId);
        }
      });
      
      // Add stops to trips with pre-calculated times
      for (const change of changes) {
        if (change.type === 'add') {
          // Use pre-calculated times from the pending change
          if (change.tripTimes) {
            for (const tripId of tripIds) {
              const times = change.tripTimes[tripId];
              if (times) {
                await addStopToTrips([tripId], change.stopId, times.arrivalTime, times.departureTime);
              } else {
                await addStopToTrips([tripId], change.stopId, '00:01:00', '00:01:00');
              }
            }
          } else {
            // Fallback: use default time if times weren't calculated
            await addStopToTrips(tripIds, change.stopId, '00:01:00', '00:01:00');
          }
        } else if (change.type === 'remove') {
          await removeStopFromTrips(tripIds, change.stopId);
        }
      }

      // Reorder stops to maintain the correct sequence
      const stopSequenceData = finalStopSequence.map((stopId, index) => ({
        stopId,
        sequence: index + 1,
      }));
      
      await reorderStopTimes(tripIds, stopSequenceData);

      // Refresh route details to get updated stop times
      await refreshTripsAndStops();

      // Clear pending changes for this shape
      setPendingStopChanges((prev) => {
        const newChanges = { ...prev };
        delete newChanges[selectedShapeId];
        return newChanges;
      });

      setStopEditMode('none');
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 403) {
          setStopsError('Permission denied: You need admin privileges to edit stops.');
        } else {
          setStopsError(err.response?.data?.message || 'Failed to save stop changes');
        }
      } else {
        setStopsError('An unexpected error occurred');
      }
    } finally {
      setIsSavingStops(false);
    }
  }, [
    selectedShapeId,
    hasUnsavedStopChanges,
    selectedShapeInfo,
    details,
    pendingStopChanges,
    refreshTripsAndStops,
  ]);

  // Discard stop changes
  const handleDiscardStopChanges = useCallback(() => {
    if (!selectedShapeId) return;

    setPendingStopChanges((prev) => {
      const newChanges = { ...prev };
      delete newChanges[selectedShapeId];
      return newChanges;
    });
    setStopsError(null);
    setStopEditMode('none');
  }, [selectedShapeId]);

  // Fetch all stops in bounds
  const fetchAllStopsInBounds = useCallback(
    async (bounds: { north: number; south: number; east: number; west: number }, zoom: number) => {
      // Only fetch if zoomed in enough
      if (zoom < 13) {
        setAllStops([]);
        return;
      }

      setIsLoadingAllStops(true);
      try {
        const stops = await getStopsInBounds({
          minLat: bounds.south,
          maxLat: bounds.north,
          minLon: bounds.west,
          maxLon: bounds.east,
          limit: 500,
        });
        setAllStops(stops);
      } catch (error) {
        console.error('Error fetching stops in bounds:', error);
      } finally {
        setIsLoadingAllStops(false);
      }
    },
    []
  );

  return {
    allStops,
    isLoadingAllStops,
    stopEditMode,
    pendingStopChanges,
    hasUnsavedStopChanges,
    isSavingStops,
    stopsError,
    stopToRemove,
    removeStopDialogOpen,
    setRemoveStopDialogOpen,
    getCurrentStopIds,
    handleToggleStopEdit,
    handleAddStopToRoute,
    handleRemoveStopClick,
    handleConfirmRemoveStop,
    handleSaveStopChanges,
    handleDiscardStopChanges,
    fetchAllStopsInBounds,
    // Refs for marker callbacks
    stopEditModeRef,
    selectedShapeIdRef,
    pendingStopChangesRef,
    getCurrentStopIdsRef,
    handleAddStopToRouteRef,
    handleRemoveStopClickRef,
  };
}
