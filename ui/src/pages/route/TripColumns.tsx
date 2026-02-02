import type { StopTime } from "../../types/gtfs";

interface TripColumn {
  tripId: string;
  stopTimes: { [stopId: string]: StopTime };
}

interface RouteTripColumnsProps {
  trips: TripColumn[];
  stopSequence: string[];
}

function TimeCell({ stopTime }: { stopTime: StopTime | undefined }) {
  const time = stopTime?.departure_time || stopTime?.arrival_time;
  const displayTime = time ? time.substring(0, 5) : "-";
  return (
    <div className="h-10 px-2 flex items-center justify-center">
      <span className="text-xs font-mono">{displayTime}</span>
    </div>
  );
}

function TripColumnRow({
  trip,
  tripIndex,
  stopSequence,
}: {
  trip: TripColumn;
  tripIndex: number;
  stopSequence: string[];
}) {
  return (
    <div className="min-w-[70px] border-r last:border-r-0">
      <div className="h-10 border-b px-2 flex items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground">#{tripIndex + 1}</span>
      </div>
      {stopSequence.map((stopId, stopIndex) => (
        <TimeCell
          key={`${trip.tripId}-${stopId}-${stopIndex}`}
          stopTime={trip.stopTimes[stopId]}
        />
      ))}
    </div>
  );
}

export default function RouteTripColumns({ trips, stopSequence }: RouteTripColumnsProps) {
  return (
    <div className="flex">
      {trips.map((trip, tripIndex) => (
        <TripColumnRow
          key={trip.tripId}
          trip={trip}
          tripIndex={tripIndex}
          stopSequence={stopSequence}
        />
      ))}
    </div>
  );
}

