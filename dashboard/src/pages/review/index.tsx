import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileEdit,
  Loader2,
  Map,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  Changeset,
  ChangesetStatus,
  listChangesets,
  approveChangeset,
  rejectChangeset,
  canReview,
} from '@/services/changesets';
import { ReviewMap } from './ReviewMap';
import { ChangesetHierarchy } from '@/components/EntityChangeCard';

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

// Color palette for changesets
const CHANGESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#8b5cf6',
];

interface ChangesetRowProps {
  changeset: Changeset;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onViewRoute: (changeset: Changeset) => void;
  isProcessing: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  color?: string;
}

function ChangesetRow({
  changeset,
  onApprove,
  onReject,
  onViewRoute,
  isProcessing,
  isSelected,
  onSelect,
  color,
}: ChangesetRowProps) {
  const [expanded, setExpanded] = useState(false);
  const routeId = getRouteFromChangeset(changeset);
  const stopId = getStopFromChangeset(changeset);

  return (
    <>
      <tr
        className={`hover:bg-accent/50 transition-colors cursor-pointer ${
          isSelected ? 'bg-accent/30' : ''
        }`}
        onClick={() => onSelect(changeset.id)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {color && (
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
            )}
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">
                {changeset.user?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {changeset.user?.username || 'Unknown User'}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          {changeset.description || (
            <span className="text-muted-foreground italic">No description</span>
          )}
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
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
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
            {changeset.status === ChangesetStatus.PENDING && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReject(changeset.id)}
                  disabled={isProcessing}
                  className="text-muted-foreground hover:text-destructive"
                  title="Reject"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onApprove(changeset.id)}
                  disabled={isProcessing}
                  className="text-muted-foreground hover:text-green-600"
                  title="Approve"
                >
                  <Check className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr onClick={(e) => e.stopPropagation()}>
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

export default function ReviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [changesets, setChangesets] = useState<Changeset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedChangesetId, setSelectedChangesetId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  // Dialogs
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedDialogChangesetId, setSelectedDialogChangesetId] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const userRoles = user?.roles || [];
  const canUserReview = canReview(userRoles);

  // Build color map
  const changesetColorMap = useMemo(() => {
    const colorMap: Record<string, string> = {};
    changesets.forEach((cs, index) => {
      colorMap[cs.id] = CHANGESET_COLORS[index % CHANGESET_COLORS.length];
    });
    return colorMap;
  }, [changesets]);

  const fetchChangesets = async (status: ChangesetStatus) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listChangesets({ status, limit: 50 });
      setChangesets(response.data);
      setSelectedChangesetId(null);
    } catch (err) {
      console.error('Failed to fetch changesets:', err);
      setError('Failed to load changesets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const statusMap: Record<string, ChangesetStatus> = {
      pending: ChangesetStatus.PENDING,
      approved: ChangesetStatus.APPROVED,
      rejected: ChangesetStatus.REJECTED,
    };
    fetchChangesets(statusMap[activeTab]);
  }, [activeTab]);

  const handleViewRoute = (changeset: Changeset) => {
    const routeId = getRouteFromChangeset(changeset);
    if (!routeId) return;
    navigate(`/routes/${encodeURIComponent(routeId)}?changeset=${changeset.id}`);
  };

  const handleApproveClick = (id: string) => {
    setSelectedDialogChangesetId(id);
    setComment('');
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (id: string) => {
    setSelectedDialogChangesetId(id);
    setComment('');
    setRejectDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedDialogChangesetId) return;

    setProcessingId(selectedDialogChangesetId);
    try {
      await approveChangeset(selectedDialogChangesetId, comment || undefined);
      setApproveDialogOpen(false);
      fetchChangesets(ChangesetStatus.PENDING);
    } catch (err) {
      console.error('Failed to approve changeset:', err);
      setError('Failed to approve changeset');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedDialogChangesetId) return;

    setProcessingId(selectedDialogChangesetId);
    try {
      await rejectChangeset(selectedDialogChangesetId, comment || undefined);
      setRejectDialogOpen(false);
      fetchChangesets(ChangesetStatus.PENDING);
    } catch (err) {
      console.error('Failed to reject changeset:', err);
      setError('Failed to reject changeset');
    } finally {
      setProcessingId(null);
    }
  };

  if (!canUserReview) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">
          You need moderator or admin privileges to review changesets.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Review Changesets</h1>
          <p className="text-muted-foreground">Review and approve changes submitted by contributors</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showMap ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowMap(!showMap)}
          >
            <Map className="w-4 h-4 mr-1" />
            {showMap ? 'Hide Map' : 'Show Map'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchChangesets(ChangesetStatus.PENDING)}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Map view - only show for pending changesets */}
      {showMap && activeTab === 'pending' && (
        <div className="mb-4">
          <ReviewMap
            changesets={changesets}
            selectedChangesetId={selectedChangesetId}
            onSelectChangeset={setSelectedChangesetId}
            isLoading={isLoading}
          />
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'pending' | 'approved' | 'rejected')}
        className="flex-1 flex flex-col"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : changesets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <FileEdit className="w-12 h-12 mb-4" />
              <p>No {activeTab} changesets</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Changes</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Routes</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Submitted</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {changesets.map((changeset) => (
                      <ChangesetRow
                        key={changeset.id}
                        changeset={changeset}
                        onApprove={handleApproveClick}
                        onReject={handleRejectClick}
                        onViewRoute={handleViewRoute}
                        isProcessing={processingId === changeset.id}
                        isSelected={selectedChangesetId === changeset.id}
                        onSelect={setSelectedChangesetId}
                        color={changesetColorMap[changeset.id]}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Changeset</AlertDialogTitle>
            <AlertDialogDescription>
              This will apply all changes to the database. The changes will become visible to all
              users.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="approve-comment">Comment (optional)</Label>
              <textarea
                id="approve-comment"
                className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Add a comment for the contributor..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={!!processingId}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={!!processingId}>
              {processingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Approve
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Changeset</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the changeset. Please provide feedback to help the contributor
              understand why.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reject-comment">Reason for rejection</Label>
              <textarea
                id="reject-comment"
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Explain why this changeset is being rejected..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={!!processingId}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!!processingId}>
              {processingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
              Reject
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
