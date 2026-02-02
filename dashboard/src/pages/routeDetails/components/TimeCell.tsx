import { Input } from '@/components/ui/input';

interface TimeCellProps {
  tripId: string;
  stopId: string;
  arrivalTime: string;
  departureTime: string;
  timingsEditMode: boolean;
  updateTripTime: (tripId: string, stopId: string, arrivalTime: string, departureTime: string) => void;
}

export function TimeCell({
  tripId,
  stopId,
  arrivalTime,
  departureTime,
  timingsEditMode,
  updateTripTime,
}: TimeCellProps) {
  const displayTime = departureTime || arrivalTime;
  const timeStr = displayTime ? displayTime.substring(0, 5) : '-';

  if (timingsEditMode) {
    return (
      <div className={`px-2 h-16 py-1 flex items-center justify-center`}>
        <div className="flex flex-col gap-1 w-full">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground">A:</span>
            <Input
              type="time"
              value={arrivalTime ? arrivalTime.substring(0, 5) : ''}
              onChange={(e) => {
                const newTime = e.target.value ? `${e.target.value}:00` : '';
                updateTripTime(
                  tripId,
                  stopId,
                  newTime,
                  departureTime || newTime
                );
              }}
              className="h-6 text-xs font-mono"
              step="60"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground">D:</span>
            <Input
              type="time"
              value={departureTime ? departureTime.substring(0, 5) : ''}
              onChange={(e) => {
                const newTime = e.target.value ? `${e.target.value}:00` : '';
                updateTripTime(
                  tripId,
                  stopId,
                  arrivalTime || newTime,
                  newTime
                );
              }}
              className="h-6 text-xs font-mono"
              step="60"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`px-2 h-10 flex items-center justify-center`}>
      <span className="text-xs font-mono">{timeStr}</span>
    </div>
  );
}
