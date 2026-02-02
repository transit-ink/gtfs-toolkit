import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { TimeCell } from './timeCell';

interface TripColumnTimeCellProps {
  tripId: string;
  stopId: string;
  stopIndex: number;
  getDisplayTime: (tripId: string, stopId: string, type: 'arrival' | 'departure') => string;
  timingsEditMode: boolean;
  updateTripTime: (
    tripId: string,
    stopId: string,
    arrivalTime: string,
    departureTime: string
  ) => void;
}

function TripColumnTimeCell({
  tripId,
  stopId,
  stopIndex: _stopIndex,
  getDisplayTime,
  timingsEditMode,
  updateTripTime,
}: TripColumnTimeCellProps) {
  const arrivalTime = getDisplayTime(tripId, stopId, 'arrival');
  const departureTime = getDisplayTime(tripId, stopId, 'departure');
  return (
    <TimeCell
      tripId={tripId}
      stopId={stopId}
      arrivalTime={arrivalTime}
      departureTime={departureTime}
      timingsEditMode={timingsEditMode}
      updateTripTime={updateTripTime}
    />
  );
}

interface TripColumnProps {
  tripId: string;
  tripIndex: number;
  stopSequence: string[];
  timingsEditMode: boolean;
  getDisplayTime: (tripId: string, stopId: string, type: 'arrival' | 'departure') => string;
  updateTripTime: (
    tripId: string,
    stopId: string,
    arrivalTime: string,
    departureTime: string
  ) => void;
  adjustColumnTime: (tripId: string, minutes: number) => void;
  onDeleteTrip: (tripId: string, tripNumber: number) => void;
}

export function TripColumn({
  tripId,
  tripIndex,
  stopSequence,
  timingsEditMode,
  getDisplayTime,
  updateTripTime,
  adjustColumnTime,
  onDeleteTrip,
}: TripColumnProps) {
  return (
    <div
      className={`border-r last:border-r-0 ${timingsEditMode ? 'min-w-[140px]' : 'min-w-[70px]'}`}
    >
      <div className="h-10 border-b px-2 flex items-center justify-between bg-muted/50">
        <span className="text-xs font-medium text-muted-foreground">#{tripIndex + 1}</span>
        <div className="flex items-center gap-1">
          {timingsEditMode && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={e => {
                e.stopPropagation();
                onDeleteTrip(tripId, tripIndex + 1);
              }}
              title="Delete trip"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          {timingsEditMode && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={e => {
                  e.stopPropagation();
                  adjustColumnTime(tripId, -1);
                }}
                title="Decrease all times by 1 minute"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={e => {
                  e.stopPropagation();
                  adjustColumnTime(tripId, 1);
                }}
                title="Increase all times by 1 minute"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
      {stopSequence.map((stopId, stopIndex) => (
        <TripColumnTimeCell
          key={`${tripId}-${stopId}-${stopIndex}`}
          tripId={tripId}
          stopId={stopId}
          stopIndex={stopIndex}
          getDisplayTime={getDisplayTime}
          timingsEditMode={timingsEditMode}
          updateTripTime={updateTripTime}
        />
      ))}
    </div>
  );
}
