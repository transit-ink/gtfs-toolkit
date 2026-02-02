import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getGroups, Group } from '@/services/groups';
import { AlertCircle, Layers, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateGroupDialog } from './createGroupDialog';
import { DeleteGroupDialog } from './deleteGroupDialog';

function getItemCounts(group: Group) {
  const stops = group.items.filter((item) => item.type === 'stop').length;
  const routes = group.items.filter((item) => item.type === 'route').length;
  return { stops, routes };
}

interface GroupCardProps {
  group: Group;
  onClick: (groupId: string) => void;
  onDelete: (e: React.MouseEvent, group: Group) => void;
}

function GroupCard({ group, onClick, onDelete }: GroupCardProps) {
  const { stops, routes } = getItemCounts(group);
  return (
    <div
      onClick={() => onClick(group.group_id)}
      className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 p-2 rounded-md bg-primary/10 text-primary">
          <Layers className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{group.name}</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{group.group_id}</span>
            <span>•</span>
            <span>{group.items.length} items</span>
            {(stops > 0 || routes > 0) && (
              <>
                <span>•</span>
                <span>
                  {routes > 0 && `${routes} route${routes !== 1 ? 's' : ''}`}
                  {routes > 0 && stops > 0 && ', '}
                  {stops > 0 && `${stops} stop${stops !== 1 ? 's' : ''}`}
                </span>
              </>
            )}
          </div>
          {group.description && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {group.description}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => onDelete(e, group)}
          title="Delete group"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  // Fetch groups on mount
  useEffect(() => {
    const fetchGroups = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getGroups();
        setGroups(data);
        setFilteredGroups(data);
      } catch (err) {
        console.error('Error fetching groups:', err);
        setError('Failed to load groups. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, []);

  // Filter groups based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredGroups(groups);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = groups.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        group.group_id.toLowerCase().includes(query) ||
        group.description?.toLowerCase().includes(query)
    );
    setFilteredGroups(filtered);
  }, [searchQuery, groups]);

  // Handle group click - navigate to group details
  const handleGroupClick = (groupId: string) => {
    navigate(`/groups/${encodeURIComponent(groupId)}`);
  };

  // Handle group created - navigate to the new group
  const handleGroupCreated = (groupId: string) => {
    navigate(`/groups/${encodeURIComponent(groupId)}`);
  };

  // Handle delete button click
  const handleDeleteClick = (e: React.MouseEvent, group: Group) => {
    e.stopPropagation(); // Prevent navigating to group details
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  };

  // Handle group deleted
  const handleGroupDeleted = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.group_id !== groupId));
    setGroupToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading groups...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Groups</h1>
          <p className="text-muted-foreground">Manage collections of routes and stops</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Group
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 mb-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Empty State */}
      {!error && filteredGroups.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
          {searchQuery.trim() ? (
            <p>No groups found for "{searchQuery}"</p>
          ) : (
            <>
              <p className="mb-4">No groups yet</p>
              <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create your first group
              </Button>
            </>
          )}
        </div>
      )}

      {/* Groups List */}
      {filteredGroups.length > 0 && (
        <div className="space-y-2">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onClick={handleGroupClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      <CreateGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onGroupCreated={handleGroupCreated}
      />

      <DeleteGroupDialog
        group={groupToDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onGroupDeleted={handleGroupDeleted}
      />
    </div>
  );
}
