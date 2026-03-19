import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useChangeset } from '@/context/ChangesetContext';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileEdit,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  Changeset,
  ChangesetStatus,
  listChangesets,
  deleteChangeset,
  submitChangeset,
  isContributor,
} from '@/services/changesets';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { ChangesetHierarchy } from '@/components/EntityChangeCard';

// Status badge component
function StatusBadge({ status }: { status: ChangesetStatus }) {
  const styles = {
    [ChangesetStatus.DRAFT]: 'bg-gray-100 text-gray-700',
    [ChangesetStatus.PENDING]: 'bg-yellow-100 text-yellow-700',
    [ChangesetStatus.APPROVED]: 'bg-green-100 text-green-700',
    [ChangesetStatus.REJECTED]: 'bg-red-100 text-red-700',
  };

  const labels = {
    [ChangesetStatus.DRAFT]: 'Draft',
    [ChangesetStatus.PENDING]: 'Pending Review',
    [ChangesetStatus.APPROVED]: 'Approved',
    [ChangesetStatus.REJECTED]: 'Rejected',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// Get the primary route from a changeset (uses changeset-level field first, then derives from changes)
function getRouteFromChangeset(changeset: Changeset): string | null {
  // First check changeset-level related_route_id
  if (changeset.related_route_id) {
    return changeset.related_route_id;
  }

  // Fall back to deriving from changes
  for (const change of changeset.changes) {
    if (change.entity_type === 'route') {
      return change.entity_id;
    }
    if (change.related_route_id) {
      return change.related_route_id;
    }
  }

  return null;
}

// Get the primary stop from a changeset
function getStopFromChangeset(changeset: Changeset): string | null {
  // First check changeset-level related_stop_id
  if (changeset.related_stop_id) {
    return changeset.related_stop_id;
  }

  // Fall back to deriving from changes
  for (const change of changeset.changes) {
    if (change.entity_type === 'stop') {
      return change.entity_id;
    }
    if (change.related_stop_id) {
      return change.related_stop_id;
    }
  }

  return null;
}

interface ChangesetRowProps {
  changeset: Changeset;
  onViewRoute: (changeset: Changeset) => void;
  onSubmit: (changeset: Changeset) => void;
  onDelete: (changeset: Changeset) => void;
  isProcessing: boolean;
}

function ChangesetRow({
  changeset,
  onViewRoute,
  onSubmit,
  onDelete,
  isProcessing,
}: ChangesetRowProps) {
  const [expanded, setExpanded] = useState(false);
  const routeId = getRouteFromChangeset(changeset);
  const stopId = getStopFromChangeset(changeset);

  return (
    <>
      <tr className="hover:bg-accent/50 transition-colors">
        <td className="px-4 py-3 text-sm">
          {changeset.description || (
            <span className="text-muted-foreground italic">No description</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm">
          <StatusBadge status={changeset.status} />
        </td>
        <td className="px-4 py-3 text-sm text-center">
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
            {changeset.changes.length}
          </span>
        </td>
        <td className="px-4 py-3 text-sm">
          {routeId ? (
            <span className="text-muted-foreground">{routeId}</span>
          ) : stopId ? (
            <span className="text-muted-foreground">Stop: {stopId}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(changeset.created_at).toLocaleDateString()}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? 'Hide details' : 'Show details'}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            {routeId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewRoute(changeset)}
                title="View on route"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
            {changeset.status === ChangesetStatus.DRAFT && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSubmit(changeset)}
                  disabled={isProcessing || changeset.changes.length === 0}
                  title="Submit for review"
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(changeset)}
                  disabled={isProcessing}
                  className="text-muted-foreground hover:text-destructive"
                  title="Delete changeset"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-muted/30">
            <div className="border rounded-lg p-3 bg-background">
              <ChangesetHierarchy changes={changeset.changes} />
            </div>
            {changeset.status === ChangesetStatus.APPROVED && changeset.reviewed_at && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Check className="w-3 h-3 text-green-600" />
                Approved by {changeset.reviewer?.username || 'Unknown'} on{' '}
                {new Date(changeset.reviewed_at).toLocaleString()}
                {changeset.review_comment && (
                  <span className="ml-2 italic">"{changeset.review_comment}"</span>
                )}
              </div>
            )}
            {changeset.status === ChangesetStatus.REJECTED && changeset.reviewed_at && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <X className="w-3 h-3 text-red-600" />
                Rejected by {changeset.reviewer?.username || 'Unknown'} on{' '}
                {new Date(changeset.reviewed_at).toLocaleString()}
                {changeset.review_comment && (
                  <span className="ml-2 italic">"{changeset.review_comment}"</span>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function MyChangesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshDraft } = useChangeset();
  const [changesets, setChangesets] = useState<Changeset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Dialog states
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedChangeset, setSelectedChangeset] = useState<Changeset | null>(null);
  const [submitDescription, setSubmitDescription] = useState('');

  const userRoles = user?.roles || [];
  const isContributorUser = isContributor(userRoles);

  const fetchChangesets = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await listChangesets({ user_id: user.id, limit: 100 });
      // Sort by created_at desc
      const sorted = response.data.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setChangesets(sorted);
    } catch (err) {
      console.error('Failed to fetch changesets:', err);
      setError('Failed to load changesets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChangesets();
  }, [user?.id]);

  const handleViewRoute = (changeset: Changeset) => {
    const routeId = getRouteFromChangeset(changeset);
    if (!routeId) return;
    navigate(`/routes/${encodeURIComponent(routeId)}?changeset=${changeset.id}`);
  };

  const handleSubmitClick = (changeset: Changeset) => {
    setSelectedChangeset(changeset);
    setSubmitDescription(changeset.description || '');
    setSubmitDialogOpen(true);
  };

  const handleDeleteClick = (changeset: Changeset) => {
    setSelectedChangeset(changeset);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedChangeset || !submitDescription.trim()) return;

    setProcessingId(selectedChangeset.id);
    try {
      await submitChangeset(selectedChangeset.id, submitDescription.trim());
      setSubmitDialogOpen(false);
      fetchChangesets();
      refreshDraft();
    } catch (err) {
      console.error('Failed to submit changeset:', err);
      setError('Failed to submit changeset');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedChangeset) return;

    setProcessingId(selectedChangeset.id);
    try {
      await deleteChangeset(selectedChangeset.id);
      setDeleteDialogOpen(false);
      fetchChangesets();
      refreshDraft();
    } catch (err) {
      console.error('Failed to delete changeset:', err);
      setError('Failed to delete changeset');
    } finally {
      setProcessingId(null);
    }
  };

  if (!isContributorUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">
          This page is only for contributors. Moderators and admins can make direct edits.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">My Changes</h1>
          <p className="text-muted-foreground">View and manage your changesets</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchChangesets}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : changesets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <FileEdit className="w-12 h-12 mb-4" />
          <p>No changesets yet</p>
          <p className="text-sm mt-1">Start editing routes to create changesets</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden flex-1">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Changes</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Routes</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {changesets.map((changeset) => (
                  <ChangesetRow
                    key={changeset.id}
                    changeset={changeset}
                    onViewRoute={handleViewRoute}
                    onSubmit={handleSubmitClick}
                    onDelete={handleDeleteClick}
                    isProcessing={processingId === changeset.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit Dialog */}
      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit for Review</AlertDialogTitle>
            <AlertDialogDescription>
              Submit this changeset for moderator review. Please provide a description of the
              changes.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="submit-description">Description *</Label>
              <textarea
                id="submit-description"
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Describe your changes..."
                value={submitDescription}
                onChange={(e) => setSubmitDescription(e.target.value)}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubmitDialogOpen(false)}
              disabled={!!processingId}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!!processingId || !submitDescription.trim()}
            >
              {processingId ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Changeset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this changeset? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={!!processingId}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!!processingId}>
              {processingId ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
