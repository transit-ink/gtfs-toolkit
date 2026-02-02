import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Stop } from '@/types/gtfs';
import { Loader2 } from 'lucide-react';

interface RemoveStopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stop: Stop | null;
  tripCount: number;
  isRemoving: boolean;
  onConfirm: () => void;
}

export function RemoveStopDialog({
  open,
  onOpenChange,
  stop,
  tripCount,
  isRemoving,
  onConfirm,
}: RemoveStopDialogProps) {
  if (!stop) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove stop from route?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2">
              <div>
                Are you sure you want to remove <strong>{stop.stop_name}</strong> from this route?
              </div>
              <div className="text-sm">
                This will remove the stop from {tripCount} trip{tripCount !== 1 ? 's' : ''} in this direction.
              </div>
            </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isRemoving}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isRemoving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              'Remove Stop'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
