import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChangeset } from '@/context/ChangesetContext';
import { Change } from '@/services/changesets';
import { AlertCircle, Check, FileEdit, Loader2, Send, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { EntityChangeCard } from './EntityChangeCard';

interface ChangeItemProps {
  change: Change;
  onRemove: (changeId: string) => void;
}

function ChangeItem({ change, onRemove }: ChangeItemProps) {
  return (
    <div className="relative group">
      <EntityChangeCard change={change} compact />
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
        onClick={() => onRemove(change.id)}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function ChangesetPanel() {
  const {
    draftChangeset,
    isLoading,
    error,
    isContributorUser,
    hasChanges,
    changeCount,
    submitChangeset,
    removeChange,
    discardDraft,
  } = useChangeset();

  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Don't show panel for non-contributors
  if (!isContributorUser) {
    return null;
  }

  const handleSubmit = async () => {
    if (!description.trim()) {
      setSubmitError('Please provide a description for your changes');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitChangeset(description.trim());
      setIsSubmitDialogOpen(false);
      setDescription('');
    } catch {
      setSubmitError('Failed to submit changes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = async () => {
    try {
      await discardDraft();
      setIsDiscardDialogOpen(false);
    } catch {
      // Error is handled by context
    }
  };

  const handleRemoveChange = async (changeId: string) => {
    try {
      await removeChange(changeId);
    } catch {
      // Error is handled by context
    }
  };

  return (
    <>
      <div className="text-base flex items-center gap-2">
        <FileEdit className="w-4 h-4" />
        Your Changes
        {changeCount > 0 && (
          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
            {changeCount}
          </span>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        {hasChanges ? 'Review and submit your pending changes' : 'Your edits will appear here'}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      ) : hasChanges && draftChangeset ? (
        <ScrollArea className="h-64">
          <div className="space-y-2 pr-3">
            {draftChangeset.changes.map(change => (
              <ChangeItem key={change.id} change={change} onRemove={handleRemoveChange} />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-6 text-muted-foreground text-sm">No pending changes</div>
      )}

      {hasChanges && (
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDiscardDialogOpen(true)}
            disabled={isLoading}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Discard
          </Button>
          <Button
            size="sm"
            onClick={() => setIsSubmitDialogOpen(true)}
            disabled={isLoading}
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-1" />
            Submit for Review
          </Button>
        </CardFooter>
      )}

      {/* Submit Dialog */}
      <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Changes for Review</AlertDialogTitle>
            <AlertDialogDescription>
              Describe your changes. A moderator will review and approve them before they become
              visible to everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g., Added new bus stop at Main Street, updated stop times for Route 42"
                value={description}
                onChange={e => setDescription(e.target.value)}
                autoFocus
              />
            </div>

            {submitError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {submitError}
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <strong>{changeCount}</strong> change{changeCount !== 1 ? 's' : ''} will be submitted
            </div>
          </div>

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSubmitDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Submit
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Dialog */}
      <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard All Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your pending changes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setIsDiscardDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDiscard}>
              <Trash2 className="w-4 h-4 mr-2" />
              Discard All
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
