import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  FileEdit,
  Loader2,
  Map,
  RefreshCw,
  User,
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

interface ChangesetCardProps {
  changeset: Changeset;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  color?: string;
}

function ChangesetCard({ 
  changeset, 
  onApprove, 
  onReject, 
  isProcessing,
  isSelected,
  onSelect,
  color,
}: ChangesetCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card 
      className={`transition-all cursor-pointer ${isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow'}`}
      onClick={() => onSelect(changeset.id)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {color && (
              <div
                className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: color }}
              />
            )}
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                {changeset.user?.username || 'Unknown User'}
              </CardTitle>
              <CardDescription className="mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(changeset.created_at).toLocaleString()}
                </span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              {changeset.changes.length} change{changeset.changes.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent onClick={(e) => e.stopPropagation()}>
        {changeset.description && (
          <div className="mb-3 p-2 bg-muted rounded text-sm">{changeset.description}</div>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Changes:</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show Details
                </>
              )}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mb-4 border rounded-lg p-3 bg-muted/30">
            <ChangesetHierarchy changes={changeset.changes} />
          </div>
        )}

        {changeset.status === ChangesetStatus.PENDING && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onReject(changeset.id);
              }}
              disabled={isProcessing}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onApprove(changeset.id);
              }}
              disabled={isProcessing} 
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
          </div>
        )}

        {changeset.status === ChangesetStatus.APPROVED && changeset.reviewed_at && (
          <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-green-600" />
              Approved by {changeset.reviewer?.username || 'Unknown'} on{' '}
              {new Date(changeset.reviewed_at).toLocaleString()}
            </div>
            {changeset.review_comment && (
              <div className="mt-1 italic">"{changeset.review_comment}"</div>
            )}
          </div>
        )}

        {changeset.status === ChangesetStatus.REJECTED && changeset.reviewed_at && (
          <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
            <div className="flex items-center gap-1">
              <X className="w-3 h-3 text-red-600" />
              Rejected by {changeset.reviewer?.username || 'Unknown'} on{' '}
              {new Date(changeset.reviewed_at).toLocaleString()}
            </div>
            {changeset.review_comment && (
              <div className="mt-1 italic">"{changeset.review_comment}"</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Color palette matching ReviewMap
const CHANGESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#8b5cf6',
];

export default function ReviewPage() {
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
      // Refresh the list
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
      // Refresh the list
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
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pr-4">
                {changesets.map((changeset) => (
                  <ChangesetCard
                    key={changeset.id}
                    changeset={changeset}
                    onApprove={handleApproveClick}
                    onReject={handleRejectClick}
                    isProcessing={processingId === changeset.id}
                    isSelected={selectedChangesetId === changeset.id}
                    onSelect={setSelectedChangesetId}
                    color={changesetColorMap[changeset.id]}
                  />
                ))}
              </div>
            </ScrollArea>
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
