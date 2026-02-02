import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Stop, Trip } from '@/types/gtfs';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function TripListItem({
  trip,
  onNavigateToRoute,
}: {
  trip: Trip;
  onNavigateToRoute: (routeId: string) => void;
}) {
  return (
    <li
      className="font-mono text-xs px-2 py-1.5 hover:bg-muted cursor-pointer flex items-center justify-between group"
      onClick={() => onNavigateToRoute(trip.route_id)}
    >
      <span>
        {trip.trip_id}
        {trip.trip_headsign && (
          <span className="text-muted-foreground ml-2">({trip.trip_headsign})</span>
        )}
      </span>
      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </li>
  );
}

interface DeleteStopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStop: Stop | null;
  childStops: Stop[];
  tripsForStop: Trip[];
  isLoadingTrips: boolean;
  isSaving: boolean;
  onDelete: () => void;
}

export function DeleteStopDialog({
  open,
  onOpenChange,
  selectedStop,
  childStops,
  tripsForStop,
  isLoadingTrips,
  isSaving,
  onDelete,
}: DeleteStopDialogProps) {
  const navigate = useNavigate();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Stop</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Are you sure you want to delete "{selectedStop?.stop_name}"?</p>
              
              {childStops.length > 0 && (
                <p>
                  This stop is a parent to {childStops.length} other stop(s). Deleting it will remove the parent
                  reference from those stops.
                </p>
              )}

              {isLoadingTrips ? (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking for trips...
                </div>
              ) : tripsForStop.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-medium text-destructive">
                    This stop is included in {tripsForStop.length} trip(s). Deleting this stop will remove it from
                    the following trips:
                  </p>
                  <ScrollArea className="h-32 rounded border">
                    <ul className="text-sm">
                      {tripsForStop.map((trip) => (
                        <TripListItem
                          key={trip.trip_id}
                          trip={trip}
                          onNavigateToRoute={(routeId) => {
                            onOpenChange(false);
                            navigate(`/routes/${encodeURIComponent(routeId)}`);
                          }}
                        />
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              ) : null}

              <p className="text-sm">This action cannot be undone.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={isSaving || isLoadingTrips}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
