import { ArrowRight } from 'lucide-react';
import type { Stop, StopTime } from '../../types/gtfs';

interface ShapeInfo {
  shapeId: string;
  tripId: string;
  tripIds: string[]; // All trip IDs for this shape
  stopTimes: StopTime[];
  firstStop?: Stop;
  lastStop?: Stop;
}

interface RouteDirectionSelectorProps {
  shapeInfos: ShapeInfo[];
  selectedShapeId: string | null;
  onSelectShape: (shapeId: string) => void;
}

interface DirectionOptionRowProps {
  info: ShapeInfo;
  selected: boolean;
  onSelect: () => void;
}

function DirectionOptionRow({ info, selected, onSelect }: DirectionOptionRowProps) {
  return (
    <label
      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors"
      htmlFor={`direction-${info.shapeId}`}
    >
      <input
        id={`direction-${info.shapeId}`}
        type="radio"
        name="direction"
        value={info.shapeId}
        checked={selected}
        onChange={onSelect}
        className="w-4 h-4 text-primary accent-primary shrink-0"
      />
      <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
        <span className="truncate">{info.firstStop?.stop_name || 'Start'}</span>
        <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{info.lastStop?.stop_name || 'End'}</span>
      </div>
    </label>
  );
}

export default function RouteDirectionSelector({
  shapeInfos,
  selectedShapeId,
  onSelectShape,
}: RouteDirectionSelectorProps) {
  if (shapeInfos.length <= 1) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">Direction</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Tap on a different route line on the map to switch direction
      </p>
      <div>
        {shapeInfos.map(info => (
          <DirectionOptionRow
            key={info.shapeId}
            info={info}
            selected={selectedShapeId === info.shapeId}
            onSelect={() => onSelectShape(info.shapeId)}
          />
        ))}
      </div>
    </section>
  );
}
