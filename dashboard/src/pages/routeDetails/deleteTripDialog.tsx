import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface DeleteTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripNumber: number;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function DeleteTripDialog({
  open,
  onOpenChange,
  tripId,
  tripNumber,
  isDeleting,
  onConfirm,
}: DeleteTripDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete trip?</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-2">
          <div>
            Are you sure you want to delete trip <strong>#{tripNumber}</strong>?
          </div>
          <div className="text-sm text-muted-foreground font-mono">{tripId}</div>
          <div className="text-sm">This will permanently delete the trip and all its stop times. This action cannot be undone.</div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Trip'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
