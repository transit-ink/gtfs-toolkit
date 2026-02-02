import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteGroup, Group } from '@/services/groups';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface DeleteGroupDialogProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupDeleted: (groupId: string) => void;
}

export function DeleteGroupDialog({ group, open, onOpenChange, onGroupDeleted }: DeleteGroupDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!group) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteGroup(group.group_id);
      onGroupDeleted(group.group_id);
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Error deleting group:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 403) {
          setError('Permission denied: You need admin privileges to delete groups.');
        } else {
          setError(axiosError.response?.data?.message || 'Failed to delete group');
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      setError(null);
      onOpenChange(newOpen);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Group</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the group "{group?.name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {group && group.items.length > 0 && (
          <div className="py-2 text-sm text-muted-foreground">
            This group contains {group.items.length} item{group.items.length !== 1 ? 's' : ''}. 
            The items themselves will not be deleted, only the group.
          </div>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
