import { Button } from '@/components/ui/button';
import { deleteTrip, duplicateTrip } from '@/services/routes';
import { Stop } from '@/types/gtfs';
import { AxiosError } from 'axios';
import { Clock, MapPin, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { StopHeader, StopRow, TripColumn } from './components';
import { DeleteTripDialog } from './deleteTripDialog';
import { PendingStopChange, TimetableData } from './types';

interface TimetableSectionProps {
  timetableData: TimetableData;
  stops: Stop[];
  pendingStopChanges: PendingStopChange[];
  onReorderStops?: (fromIndex: number, toIndex: number) => void;
  // Trip time editing props
  refreshTripsAndStops: () => Promise<void>;
  stopEditMode: 'none' | 'add' | 'remove';
  onToggleStopEdit: () => void;
  timingsEditMode: boolean;
  onToggleTimingsEdit: () => void;
  onAddTrip?: () => void;
  getDisplayTime: (tripId: string, stopId: string, type: 'arrival' | 'departure') => string;
  updateTripTime: (
    tripId: string,
    stopId: string,
    arrivalTime: string,
    departureTime: string
  ) => void;
  adjustRowTime: (stopId: string, minutes: number) => void;
  adjustColumnTime: (tripId: string, minutes: number) => void;
}

type DropPosition = 'above' | 'below' | null;

interface TimetableStopRowProps {
  stopId: string;
  index: number;
  stopSequenceLength: number;
  stops: Stop[];
  draggedIndex: number | null;
  dropTarget: { index: number; position: DropPosition } | null;
  pendingAddIds: Set<string>;
  pendingRemoveIds: Set<string>;
  stopEditMode: 'none' | 'add' | 'remove';
  onReorderStops?: (fromIndex: number, toIndex: number) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  timingsEditMode: boolean;
  adjustRowTime: (stopId: string, minutes: number) => void;
}

function TimetableStopRow({
  stopId,
  index,
  stopSequenceLength,
  stops,
  draggedIndex,
  dropTarget,
  pendingAddIds,
  pendingRemoveIds,
  stopEditMode,
  onReorderStops,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  timingsEditMode,
  adjustRowTime,
}: TimetableStopRowProps) {
  const stop = stops.find(s => s.stop_id === stopId);
  const isFirst = index === 0;
  const isLast = index === stopSequenceLength - 1;
  const isDragging = draggedIndex === index;
  const isDropAbove = dropTarget?.index === index && dropTarget.position === 'above';
  const isDropBelow = dropTarget?.index === index && dropTarget.position === 'below';
  const isPendingAdd = pendingAddIds.has(stopId);
  const isPendingRemove = pendingRemoveIds.has(stopId);

  return (
    <StopRow
      stopId={stopId}
      stop={stop}
      index={index}
      isFirst={isFirst}
      isLast={isLast}
      isDragging={isDragging}
      isDropAbove={isDropAbove}
      isDropBelow={isDropBelow}
      isPendingAdd={isPendingAdd}
      isPendingRemove={isPendingRemove}
      timingsEditMode={timingsEditMode}
      onReorderStops={stopEditMode !== 'none' ? onReorderStops : undefined}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      adjustRowTime={adjustRowTime}
    />
  );
}

export function TimetableSection({
  timetableData,
  stops,
  pendingStopChanges,
  onReorderStops,
  refreshTripsAndStops,
  stopEditMode,
  onToggleStopEdit,
  timingsEditMode,
  onToggleTimingsEdit,
  onAddTrip,
  getDisplayTime,
  updateTripTime,
  adjustRowTime,
  adjustColumnTime,
}: TimetableSectionProps) {
  const [isAddingTrip, setIsAddingTrip] = useState(false);
  const [addTripError, setAddTripError] = useState<string | null>(null);
  const [tripToDelete, setTripToDelete] = useState<{ tripId: string; tripNumber: number } | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);

  // Handle adding a new trip
  const handleAddTrip = async () => {
    if (timetableData.trips.length === 0) {
      setAddTripError('No trips to duplicate');
      return;
    }

    setIsAddingTrip(true);
    setAddTripError(null);

    try {
      const lastTrip = timetableData.trips[timetableData.trips.length - 1];
      const sourceTripId = lastTrip.tripId;

      // Generate a new trip ID (append a suffix or timestamp)
      const timestamp = Date.now();
      const newTripId = `${sourceTripId}_dup_${timestamp}`;

      await duplicateTrip(sourceTripId, newTripId, 5);

      // Refresh trips and stops
      await refreshTripsAndStops();

      // Call the optional callback
      if (onAddTrip) {
        onAddTrip();
      }
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 403) {
          setAddTripError('Permission denied: You need admin privileges to add trips.');
        } else {
          setAddTripError(err.response?.data?.message || 'Failed to add trip');
        }
      } else {
        setAddTripError('An unexpected error occurred');
      }
    } finally {
      setIsAddingTrip(false);
    }
  };

  // Handle deleting a trip
  const handleDeleteTrip = async () => {
    if (!tripToDelete) return;

    setIsDeletingTrip(true);
    try {
      await deleteTrip(tripToDelete.tripId);
      await refreshTripsAndStops();
      setDeleteDialogOpen(false);
      setTripToDelete(null);
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 403) {
          setAddTripError('Permission denied: You need admin privileges to delete trips.');
        } else {
          setAddTripError(err.response?.data?.message || 'Failed to delete trip');
        }
      } else {
        setAddTripError('An unexpected error occurred');
      }
      setDeleteDialogOpen(false);
    } finally {
      setIsDeletingTrip(false);
    }
  };

  // Build sets for pending changes
  const pendingAddIds = new Set(
    pendingStopChanges.filter(c => c.type === 'add').map(c => c.stopId)
  );
  const pendingRemoveIds = new Set(
    pendingStopChanges.filter(c => c.type === 'remove').map(c => c.stopId)
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; position: DropPosition } | null>(
    null
  );
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  const horizontalScrollRef = useRef<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(600);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const el = horizontalScrollRef.current;
    if (!el) return;

    const handleResize = () => {
      setViewportWidth(el.clientWidth || 600);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleHorizontalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollLeft(target.scrollLeft);

    if (target.clientWidth !== viewportWidth) {
      setViewportWidth(target.clientWidth);
    }
  };

  // Drag handlers - only enable when in stops edit mode
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (!onReorderStops || stopEditMode === 'none') return;
    setDraggedIndex(index);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));

    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDropTarget(null);
    dragNodeRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (!onReorderStops || stopEditMode === 'none') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex === null || draggedIndex === index) {
      setDropTarget(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: DropPosition = e.clientY < midY ? 'above' : 'below';

    setDropTarget({ index, position });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    const fromIndex = draggedIndex;

    if (fromIndex === null || !onReorderStops || stopEditMode === 'none') {
      setDraggedIndex(null);
      setDropTarget(null);
      return;
    }

    // Calculate drop position based on mouse position
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isBelow = e.clientY >= midY;

    let toIndex = index;
    if (isBelow) {
      toIndex = index + 1;
    }

    if (fromIndex < toIndex) {
      toIndex -= 1;
    }

    if (fromIndex !== toIndex) {
      onReorderStops(fromIndex, toIndex);
    }

    setDraggedIndex(null);
    setDropTarget(null);
  };

  const totalStops = timetableData.stopSequence.length;
  const totalTrips = timetableData.trips.length;
  const columnWidth = timingsEditMode ? 140 : 70; // px, matches min-w-[140px]/min-w-[70px]
  const horizontalOverscan = 3;

  const maxVisibleTrips = Math.ceil((viewportWidth || 1) / columnWidth) + horizontalOverscan * 2;
  const startTripIndex = Math.max(
    0,
    Math.floor((scrollLeft || 0) / columnWidth) - horizontalOverscan
  );
  const endTripIndex = Math.min(totalTrips, startTripIndex + maxVisibleTrips);

  const visibleTrips = timetableData.trips.slice(startTripIndex, endTripIndex);
  const leftSpacerWidth = startTripIndex * columnWidth;
  const rightSpacerWidth = (totalTrips - endTripIndex) * columnWidth;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Stops & Timetable
            </h3>
            <p className="text-sm text-muted-foreground">
              {timetableData.stopSequence.length} stops • {timetableData.trips.length} trip(s)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={stopEditMode !== 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleStopEdit}
            >
              {stopEditMode !== 'none' ? (
                <>
                  <X className="w-3 h-3 mr-1" />
                  Done
                </>
              ) : (
                <>
                  <MapPin className="w-3 h-3 mr-1" />
                  Edit Stops
                </>
              )}
            </Button>
            <Button
              variant={timingsEditMode ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleTimingsEdit}
            >
              {timingsEditMode ? (
                <>
                  <X className="w-3 h-3 mr-1" />
                  Done
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 mr-1" />
                  Edit Timings
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Add Trip button - only show during timings edit mode */}
        {timingsEditMode && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddTrip}
              disabled={isAddingTrip || timetableData.trips.length === 0}
              className="text-xs"
              title="Duplicate last trip and add 5 minutes to all stop times"
            >
              {isAddingTrip ? 'Adding...' : '+ Add Trip'}
            </Button>
            {addTripError && (
              <div className="px-2 py-1 text-xs text-destructive">{addTripError}</div>
            )}
          </div>
        )}

        <div className="-mx-4">
          <div className="max-h-[480px] overflow-y-auto">
            <div className="flex">
              {/* Fixed left column - stops (no horizontal scroll) */}
              <div className="bg-card border-r sticky left-0 z-10">
                <StopHeader
                  timingsEditMode={timingsEditMode}
                  stopSequence={timetableData.stopSequence}
                  adjustRowTime={adjustRowTime}
                />
                <div className="relative">
                  {/* Route line */}
                  <div className="absolute left-[37px] top-3 bottom-3 w-0.5 bg-primary/30" />

                  {timetableData.stopSequence.map((stopId, index) => (
                    <TimetableStopRow
                      key={`stop-${stopId}-${index}`}
                      stopId={stopId}
                      index={index}
                      stopSequenceLength={totalStops}
                      stops={stops}
                      draggedIndex={draggedIndex}
                      dropTarget={dropTarget}
                      pendingAddIds={pendingAddIds}
                      pendingRemoveIds={pendingRemoveIds}
                      stopEditMode={stopEditMode}
                      onReorderStops={onReorderStops}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      timingsEditMode={timingsEditMode}
                      adjustRowTime={adjustRowTime}
                    />
                  ))}
                </div>
              </div>

              {/* Scrollable trip columns (horizontally virtualized) */}
              <div
                className="flex-1 overflow-x-auto"
                ref={horizontalScrollRef}
                onScroll={handleHorizontalScroll}
              >
                <div className="min-w-max pr-4">
                  <div className="flex">
                    {leftSpacerWidth > 0 && <div style={{ width: leftSpacerWidth }} />}
                    {visibleTrips.map((trip, index) => {
                      const tripIndex = startTripIndex + index;
                      return (
                        <TripColumn
                          key={trip.tripId}
                          tripId={trip.tripId}
                          tripIndex={tripIndex}
                          stopSequence={timetableData.stopSequence}
                          timingsEditMode={timingsEditMode}
                          getDisplayTime={getDisplayTime}
                          updateTripTime={updateTripTime}
                          adjustColumnTime={adjustColumnTime}
                          onDeleteTrip={(tripId, tripNumber) => {
                            setTripToDelete({ tripId, tripNumber });
                            setDeleteDialogOpen(true);
                          }}
                        />
                      );
                    })}
                    {rightSpacerWidth > 0 && <div style={{ width: rightSpacerWidth }} />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Delete trip confirmation dialog */}
      <DeleteTripDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        tripId={tripToDelete?.tripId || ''}
        tripNumber={tripToDelete?.tripNumber || 0}
        isDeleting={isDeletingTrip}
        onConfirm={handleDeleteTrip}
      />
    </>
  );
}
