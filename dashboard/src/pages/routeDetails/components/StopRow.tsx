import { Button } from '@/components/ui/button';
import { Stop } from '@/types/gtfs';
import { GripVertical, Minus, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StopRowProps {
  stopId: string;
  stop: Stop | undefined;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isDragging: boolean;
  isDropAbove: boolean;
  isDropBelow: boolean;
  isPendingAdd: boolean;
  isPendingRemove: boolean;
  timingsEditMode: boolean;
  onReorderStops?: (fromIndex: number, toIndex: number) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  adjustRowTime: (stopId: string, minutes: number) => void;
}

export function StopRow({
  stopId,
  stop,
  index,
  isFirst,
  isLast,
  isDragging,
  isDropAbove,
  isDropBelow,
  isPendingAdd,
  isPendingRemove,
  timingsEditMode,
  onReorderStops,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  adjustRowTime,
}: StopRowProps) {
  const sequenceNum = index + 1;

  const getCircleClass = () => {
    if (isPendingAdd) {
      return 'bg-green-500 text-white ring-2 ring-green-500/30';
    }
    if (isPendingRemove) {
      return 'bg-red-500 text-white ring-2 ring-red-500/30 line-through';
    }
    if (isFirst) {
      return 'bg-green-500 text-white';
    }
    if (isLast) {
      return 'bg-red-500 text-white';
    }
    return 'bg-background border-2 border-primary text-primary';
  };

  return (
    <div key={`stop-${stopId}-${index}`} className="relative">
      {/* Drop indicator line - above */}
      {isDropAbove && (
        <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-primary rounded-full z-20">
          <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-primary rounded-full" />
          <div className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-primary rounded-full" />
        </div>
      )}

      <div
        draggable={!!onReorderStops}
        onDragStart={e => onDragStart(e, index)}
        onDragEnd={onDragEnd}
        onDragOver={e => onDragOver(e, index)}
        onDragLeave={onDragLeave}
        onDrop={e => onDrop(e, index)}
        className={`flex items-center gap-2 ${timingsEditMode ? 'h-16 py-1' : 'h-10'} px-3 hover:bg-accent transition-colors ${
          isDragging ? 'opacity-50' : ''
        } ${onReorderStops ? 'cursor-grab active:cursor-grabbing' : ''} ${
          isPendingAdd ? 'bg-green-50 dark:bg-green-950/20' : ''
        } ${isPendingRemove ? 'bg-red-50 dark:bg-red-950/20 opacity-50' : ''}`}
      >
        {/* Drag handle */}
        {onReorderStops && (
          <div className="shrink-0 text-muted-foreground">
            <GripVertical className="w-3 h-3" />
          </div>
        )}

        {/* Sequence number circle */}
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center z-10 shrink-0 text-[10px] font-semibold ${getCircleClass()}`}
        >
          {sequenceNum}
        </div>

        <Link
          to={`/stops`}
          className={`text-sm truncate max-w-[130px] hover:underline ${
            isPendingRemove ? 'line-through text-muted-foreground' : ''
          }`}
          onClick={e => e.stopPropagation()}
        >
          {stop?.stop_name || stopId}
        </Link>

        {isPendingAdd && <span className="text-xs text-green-600 dark:text-green-400">(new)</span>}

        {/* +1/-1 buttons for this row */}
        {timingsEditMode && (
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={e => {
                e.stopPropagation();
                adjustRowTime(stopId, -1);
              }}
              title="Decrease all times for this stop by 1 minute"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={e => {
                e.stopPropagation();
                adjustRowTime(stopId, 1);
              }}
              title="Increase all times for this stop by 1 minute"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Drop indicator line - below */}
      {isDropBelow && (
        <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary rounded-full z-20">
          <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-primary rounded-full" />
          <div className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-primary rounded-full" />
        </div>
      )}
    </div>
  );
}
