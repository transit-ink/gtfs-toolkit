import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Stop } from '@/types/gtfs';
import { Crosshair, Loader2, MapPin, MousePointer2, Move, Save, Trash2, X } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import { MIN_ZOOM_FOR_STOPS } from './constants';
import { EditMode } from './types';

function ChildStopRow({
  child,
  onSelectStop,
  onCenterOnMap,
}: {
  child: Stop;
  onSelectStop: (stop: Stop) => void;
  onCenterOnMap: (stop: Stop) => void;
}) {
  return (
    <div className="p-3 bg-muted rounded-md">
      <div className="flex items-center justify-between">
        <div
          className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onSelectStop(child)}
        >
          <p className="font-medium">{child.stop_name}</p>
          <p className="text-sm text-muted-foreground">{child.stop_id}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={e => {
            e.stopPropagation();
            onCenterOnMap(child);
          }}
          title="Center map on child"
        >
          <Crosshair className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

interface StopsSidebarProps {
  selectedStop: Stop | null;
  editName: string;
  setEditName: (name: string) => void;
  editMode: EditMode;
  setEditMode: (mode: EditMode) => void;
  isSaving: boolean;
  parentStop: Stop | null;
  isLoadingParent: boolean;
  childStops: Stop[];
  isLoadingChildren: boolean;
  map: React.MutableRefObject<maplibregl.Map | null>;
  onClose: () => void;
  onRename: () => void;
  onRemoveParent: () => void;
  onDeleteClick: () => void;
  onSelectStop: (stop: Stop) => void;
}

export function StopsSidebar({
  selectedStop,
  editName,
  setEditName,
  editMode,
  setEditMode,
  isSaving,
  parentStop,
  isLoadingParent,
  childStops,
  isLoadingChildren,
  map,
  onClose,
  onRename,
  onRemoveParent,
  onDeleteClick,
  onSelectStop,
}: StopsSidebarProps) {
  if (!selectedStop) {
    return (
      <div className="w-96 border-l bg-card flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Stop Selected</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Click on a stop marker to view and edit its details, or click "Add Stop" to create a new
            one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 border-l bg-card flex flex-col overflow-auto">
      {/* Header */}
      <div className="p-4 border-b flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
            <h2 className="text-lg font-semibold truncate">{selectedStop.stop_name}</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">ID: {selectedStop.stop_id}</p>
          {selectedStop.stop_code && (
            <p className="text-sm text-muted-foreground">Code: {selectedStop.stop_code}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Rename */}
          <div className="space-y-2">
            <Label htmlFor="stop-name">Stop Name</Label>
            <div className="flex gap-2">
              <Input
                id="stop-name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Enter stop name"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={onRename}
                disabled={isSaving || editName === selectedStop.stop_name}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <div className="text-sm text-muted-foreground">
              <p>Lat: {parseFloat(String(selectedStop.stop_lat)).toFixed(6)}</p>
              <p>Lon: {parseFloat(String(selectedStop.stop_lon)).toFixed(6)}</p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setEditMode(editMode === 'move' ? 'none' : 'move')}
              disabled={isSaving}
            >
              <Move className="w-4 h-4 mr-2" />
              {editMode === 'move' ? 'Cancel Move' : 'Edit Location'}
            </Button>
          </div>

          {/* Parent Station */}
          <div className="space-y-2">
            <Label>Parent Station</Label>
            {isLoadingParent ? (
              <div className="p-3 bg-muted rounded-md flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading parent station...</span>
              </div>
            ) : parentStop ? (
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{parentStop.stop_name}</p>
                    <p className="text-sm text-muted-foreground">{parentStop.stop_id}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (map.current && parentStop) {
                          map.current.flyTo({
                            center: [
                              parseFloat(String(parentStop.stop_lon)),
                              parseFloat(String(parentStop.stop_lat)),
                            ],
                            zoom: Math.max(map.current.getZoom(), MIN_ZOOM_FOR_STOPS),
                            duration: 200,
                          });
                        }
                      }}
                      title="Center map on parent"
                    >
                      <Crosshair className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onRemoveParent}
                      disabled={isSaving}
                      title="Remove parent"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : selectedStop.parent_station ? (
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-muted-foreground">Unknown parent</p>
                    <p className="text-sm text-muted-foreground">{selectedStop.parent_station}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={onRemoveParent} disabled={isSaving}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No parent station</p>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setEditMode(editMode === 'set-parent' ? 'none' : 'set-parent')}
              disabled={isSaving}
            >
              <MousePointer2 className="w-4 h-4 mr-2" />
              {editMode === 'set-parent' ? 'Cancel' : 'Set Parent Station'}
            </Button>
          </div>

          {/* Child Stops */}
          {(childStops.length > 0 || isLoadingChildren) && (
            <div className="space-y-2">
              <Label>Child Stops {!isLoadingChildren && `(${childStops.length})`}</Label>
              {isLoadingChildren ? (
                <div className="p-3 bg-muted rounded-md flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading child stops...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {childStops.map(child => (
                    <ChildStopRow
                      key={child.stop_id}
                      child={child}
                      onSelectStop={onSelectStop}
                      onCenterOnMap={stop => {
                        if (map.current) {
                          map.current.flyTo({
                            center: [
                              parseFloat(String(stop.stop_lon)),
                              parseFloat(String(stop.stop_lat)),
                            ],
                            zoom: Math.max(map.current.getZoom(), MIN_ZOOM_FOR_STOPS),
                            duration: 200,
                          });
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delete */}
          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              className="w-full"
              onClick={onDeleteClick}
              disabled={isSaving}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Stop
            </Button>
            {childStops.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                This stop is a parent to {childStops.length} stop(s). Deleting it will remove the
                parent reference from those stops.
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
