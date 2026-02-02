import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface StopHeaderProps {
  timingsEditMode: boolean;
  stopSequence: string[];
  adjustRowTime: (stopId: string, minutes: number) => void;
}

export function StopHeader({
  timingsEditMode,
  stopSequence,
  adjustRowTime,
}: StopHeaderProps) {
  return (
    <div className="h-10 border-b px-3 flex items-center justify-between bg-muted/50">
      <span className="text-xs font-medium text-muted-foreground">Stop</span>
      {timingsEditMode && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              // Adjust all rows by -1 minute
              stopSequence.forEach((stopId) => {
                adjustRowTime(stopId, -1);
              });
            }}
            title="Decrease all times by 1 minute"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              // Adjust all rows by +1 minute
              stopSequence.forEach((stopId) => {
                adjustRowTime(stopId, 1);
              });
            }}
            title="Increase all times by 1 minute"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
