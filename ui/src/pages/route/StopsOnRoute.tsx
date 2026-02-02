import { Link } from 'react-router-dom';
import type { Stop, StopTime } from '../../types/gtfs';
import RouteTripColumns from './tripColumns';

interface TripColumn {
  tripId: string;
  stopTimes: { [stopId: string]: StopTime };
}

interface TimetableData {
  trips: TripColumn[];
  stopSequence: string[];
}

interface RouteStopsOnRouteProps {
  timetableData: TimetableData;
  stops: Stop[];
  routeColor?: string | null;
}

interface StopRowProps {
  stopId: string;
  stop: Stop | undefined;
  isFirst: boolean;
  isLast: boolean;
  routeColorValue: string;
}

function StopRow({ stopId, stop, isFirst, isLast, routeColorValue }: StopRowProps) {
  return (
    <Link
      to={`/stop/${stop?.parent_station || stopId}`}
      className="flex items-center gap-2 h-10 px-3 hover:bg-accent transition-colors"
    >
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center z-10 shrink-0 ${
          isFirst ? 'bg-green-500' : isLast ? 'bg-red-500' : 'bg-background border-2'
        }`}
        style={
          !isFirst && !isLast
            ? {
                borderColor: routeColorValue,
              }
            : undefined
        }
      >
        {(isFirst || isLast) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
      </div>
      <span className="text-sm truncate max-w-[180px]">
        {stop?.stop_name || stopId}
      </span>
    </Link>
  );
}

export default function RouteStopsOnRoute({
  timetableData,
  stops,
  routeColor,
}: RouteStopsOnRouteProps) {
  const stopCount = timetableData.trips.length;

  const routeColorValue = routeColor ? `#${routeColor}` : 'hsl(var(--primary))';
  const routeLineColor = routeColor ? `#${routeColor}` : 'hsl(var(--primary) / 0.3)';

  return (
    <section className="overflow-hidden">
      <h2 className="text-lg font-semibold text-foreground mb-3">Stops on the route</h2>
      {stopCount > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Scroll right to see all {stopCount} trip{stopCount > 1 ? 's' : ''}
        </p>
      )}
      <div className="overflow-x-auto">
        <div className="min-w-max flex">
          {/* Fixed left column - stops */}
          <div className="sticky left-0 z-10 bg-background border-r">
            <div className="h-10 border-b px-3 flex items-center">
              <span className="text-xs font-medium text-muted-foreground">Stop</span>
            </div>
            <div className="relative">
              {/* Route line */}
              <div
                className="absolute left-[17px] top-3 bottom-3 w-0.5"
                style={{
                  backgroundColor: routeLineColor,
                }}
              />

              {timetableData.stopSequence.map((stopId, index) => (
                <StopRow
                  key={`stop-${stopId}-${index}`}
                  stopId={stopId}
                  stop={stops.find(s => s.stop_id === stopId)}
                  isFirst={index === 0}
                  isLast={index === timetableData.stopSequence.length - 1}
                  routeColorValue={routeColorValue}
                />
              ))}
            </div>
          </div>

          {/* Scrollable trip columns */}
          <RouteTripColumns trips={timetableData.trips} stopSequence={timetableData.stopSequence} />
        </div>
      </div>
    </section>
  );
}
