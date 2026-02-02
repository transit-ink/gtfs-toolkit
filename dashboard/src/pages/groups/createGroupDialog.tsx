import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { createGroup } from '@/services/groups';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: (groupId: string) => void;
}

export function CreateGroupDialog({ open, onOpenChange, onGroupCreated }: CreateGroupDialogProps) {
  const [groupId, setGroupId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setGroupId('');
      setName('');
      setDescription('');
      setError(null);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!groupId.trim() || !name.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const newGroup = await createGroup({
        group_id: groupId.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        items: [],
      });
      onGroupCreated(newGroup.group_id);
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Error creating group:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 403) {
          setError('Permission denied: You need admin privileges to create groups.');
        } else if (axiosError.response?.status === 409) {
          setError('A group with this ID already exists.');
        } else {
          setError(axiosError.response?.data?.message || 'Failed to create group');
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && groupId.trim() && name.trim() && !isCreating) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Create New Group</AlertDialogTitle>
          <AlertDialogDescription>
            Create a new group to organize routes and stops together.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2" onKeyDown={handleKeyDown}>
          <div className="space-y-2">
            <Label htmlFor="group-id">Group ID</Label>
            <Input
              id="group-id"
              placeholder="e.g., metro-line-1"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              A unique identifier for this group (used in URLs)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Metro Line 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="e.g., All stops and routes for Metro Line 1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!groupId.trim() || !name.trim() || isCreating}
          >
            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Group
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
