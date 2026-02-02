import { Button } from '@/components/ui/button';
import { Stop } from '@/types/gtfs';
import { AlertCircle, Loader2, MousePointer2, Move, Plus, X } from 'lucide-react';
import { EditMode } from './types';

interface StopsMapProps {
  mapContainerRef: React.RefObject<HTMLDivElement>;
  isLoadingStops: boolean;
  mapReady: boolean;
  stops: Stop[];
  editMode: EditMode;
  setEditMode: (mode: EditMode) => void;
  isSaving: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

export function StopsMap({
  mapContainerRef,
  isLoadingStops,
  mapReady,
  stops,
  editMode,
  setEditMode,
  isSaving,
  error,
  setError,
}: StopsMapProps) {
  return (
    <div className="flex-1 relative">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading indicator */}
      {isLoadingStops && (
        <div className="absolute top-4 left-4 bg-background/90 px-3 py-2 rounded-md shadow flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading stops...</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="absolute top-4 left-4 right-4 md:right-auto md:max-w-md bg-destructive/90 text-white px-4 py-3 rounded-md shadow flex items-start gap-3 z-20">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{error}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setError(null)}
            className="shrink-0 text-white hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Zoom hint */}
      {stops.length === 0 && !isLoadingStops && mapReady && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-background/90 px-3 py-2 rounded-md shadow text-sm">
          Zoom in to see stops
        </div>
      )}

      {/* Edit mode indicator */}
      {editMode !== 'none' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow flex items-center gap-2">
          {editMode === 'add' && (
            <>
              <Plus className="w-4 h-4" />
              <span>Click on the map to add a new stop</span>
            </>
          )}
          {editMode === 'move' && (
            <>
              <Move className="w-4 h-4" />
              <span>Click on the map to move the stop</span>
            </>
          )}
          {editMode === 'set-parent' && (
            <>
              <MousePointer2 className="w-4 h-4" />
              <span>Click on a stop to set it as parent</span>
            </>
          )}
          <Button variant="ghost" size="icon-sm" onClick={() => setEditMode('none')} className="ml-2 -mr-2">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Add stop FAB */}
      <div className="absolute bottom-6 right-6">
        <Button
          size="lg"
          onClick={() => setEditMode(editMode === 'add' ? 'none' : 'add')}
          disabled={isSaving}
          className="shadow-lg rounded-full"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Stop
        </Button>
      </div>
    </div>
  );
}
