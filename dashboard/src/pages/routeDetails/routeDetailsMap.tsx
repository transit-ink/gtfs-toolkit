import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, MapPin, Move, Pencil, Plus, Trash2, X } from 'lucide-react';
import { MutableRefObject } from 'react';
import { ShapeEditMode, ShapeInfo, StopEditMode } from './types';

function ShapeOptionRow({
  info,
  selectedShapeId,
  hasAnyUnsavedChanges,
  onSelect,
}: {
  info: ShapeInfo;
  selectedShapeId: string | null;
  hasAnyUnsavedChanges: boolean;
  onSelect: (shapeId: string) => void;
}) {
  return (
    <label
      className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent transition-colors text-sm ${
        hasAnyUnsavedChanges && info.shapeId !== selectedShapeId
          ? 'opacity-50 pointer-events-none'
          : ''
      }`}
    >
      <input
        type="radio"
        name="direction"
        value={info.shapeId}
        checked={selectedShapeId === info.shapeId}
        onChange={() => onSelect(info.shapeId)}
        className="accent-primary"
        disabled={hasAnyUnsavedChanges && info.shapeId !== selectedShapeId}
      />
      <span className="truncate">{info.firstStop?.stop_name || 'Start'}</span>
      <ArrowRight className="w-3 h-3 shrink-0 text-muted-foreground" />
      <span className="truncate">{info.lastStop?.stop_name || 'End'}</span>
    </label>
  );
}

interface RouteDetailsMapProps {
  mapContainerRef: MutableRefObject<HTMLDivElement | null>;
  shapeInfos: ShapeInfo[];
  selectedShapeId: string | null;
  setSelectedShapeId: (shapeId: string) => void;
  isEditingShape: boolean;
  shapeEditMode: ShapeEditMode;
  setShapeEditMode: (mode: ShapeEditMode) => void;
  currentPointIndex: number | null;
  onToggleShapeEdit: () => void;
  hasUnsavedShapeChanges: boolean;
  stopEditMode: StopEditMode;
  onToggleStopEdit: () => void;
  hasUnsavedStopChanges: boolean;
  isLoadingAllStops: boolean;
}

export function RouteDetailsMap({
  mapContainerRef,
  shapeInfos,
  selectedShapeId,
  setSelectedShapeId,
  isEditingShape,
  shapeEditMode,
  setShapeEditMode,
  currentPointIndex,
  onToggleShapeEdit,
  hasUnsavedShapeChanges,
  stopEditMode,
  onToggleStopEdit,
  hasUnsavedStopChanges,
  isLoadingAllStops,
}: RouteDetailsMapProps) {
  const hasAnyUnsavedChanges = hasUnsavedShapeChanges || hasUnsavedStopChanges;

  return (
    <div className="flex-1 relative">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading indicator */}
      {isLoadingAllStops && (
        <div className="absolute top-4 right-4 bg-background/90 px-3 py-2 rounded-md shadow flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading stops...</span>
        </div>
      )}

      {/* Direction selector overlay */}
      {shapeInfos.length > 0 && (
        <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3 max-w-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs text-muted-foreground">
              {shapeInfos.length > 1 ? 'Select Direction' : 'Direction'}
            </p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={stopEditMode !== 'none' ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={onToggleStopEdit}
                disabled={isEditingShape}
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
                size="sm"
                variant={isEditingShape ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={onToggleShapeEdit}
                disabled={stopEditMode !== 'none'}
              >
                {isEditingShape ? (
                  <>
                    <X className="w-3 h-3 mr-1" />
                    Done
                  </>
                ) : (
                  <>
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit Shape
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {shapeInfos.map(info => (
              <ShapeOptionRow
                key={info.shapeId}
                info={info}
                selectedShapeId={selectedShapeId}
                hasAnyUnsavedChanges={hasAnyUnsavedChanges}
                onSelect={setSelectedShapeId}
              />
            ))}
          </div>
          {isEditingShape && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex gap-1 mb-2">
                <Button
                  size="sm"
                  variant={shapeEditMode === 'move' ? 'default' : 'outline'}
                  className="h-7 text-xs flex-1"
                  onClick={() => setShapeEditMode('move')}
                >
                  <Move className="w-3 h-3 mr-1" />
                  Move
                </Button>
                <Button
                  size="sm"
                  variant={shapeEditMode === 'add' ? 'default' : 'outline'}
                  className="h-7 text-xs flex-1"
                  onClick={() => setShapeEditMode('add')}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
                <Button
                  size="sm"
                  variant={shapeEditMode === 'delete' ? 'default' : 'outline'}
                  className="h-7 text-xs flex-1"
                  onClick={() => setShapeEditMode('delete')}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {shapeEditMode === 'move' && 'Drag points to move them'}
                {shapeEditMode === 'add' &&
                  'Click anywhere on map to add a point after the current point'}
                {shapeEditMode === 'delete' && 'Click on a point to delete it'}
                {currentPointIndex !== null && ` (Current point: ${currentPointIndex + 1})`}
              </p>
            </div>
          )}
          {stopEditMode !== 'none' && (
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
              Click grey stops to add to route. Click route stops to remove.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
