import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getGroup, Group, GroupItemType, updateGroup } from '@/services/groups';
import { getRoute, getRoutesBulk, getShapesBulk, getTripsBulkByRouteIds, getTripsForRoute } from '@/services/routes';
import { getStop } from '@/services/stops';
import { Shape, Stop, Trip } from '@/types/gtfs';
import { AxiosError } from 'axios';
import { AlertCircle, ArrowLeft, Edit2, Loader2, Save, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AddItemForm } from './addItemForm';
import { GroupItemsList } from './groupItemsList';
import { GroupMap } from './groupMap';
import { GroupItemWithData, RouteWithShapes } from './types';

export default function GroupDetailsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [items, setItems] = useState<GroupItemWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch group data
  const fetchGroup = useCallback(async () => {
    if (!groupId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getGroup(groupId);
      setGroup(data);
      setEditName(data.name);
      setEditDescription(data.description || '');

      // Initialize items with loading state
      const initialItems: GroupItemWithData[] = data.items.map(item => ({
        ...item,
        loading: true,
      }));
      setItems(initialItems);

      // Separate items by type
      const routeItems = data.items.filter(item => item.type === GroupItemType.ROUTE);
      const stopItems = data.items.filter(item => item.type === GroupItemType.STOP);

      // Fetch all routes in bulk
      const routeIds = routeItems.map(item => item.id);
      const routesData = routeIds.length > 0 ? await getRoutesBulk(routeIds) : [];

      // Fetch all trips for all routes in a single call
      const allTrips = routeIds.length > 0 ? await getTripsBulkByRouteIds(routeIds) : [];

      // Group trips by route_id
      const tripsByRouteId = new Map<string, Trip[]>();
      allTrips.forEach(trip => {
        if (!tripsByRouteId.has(trip.route_id)) {
          tripsByRouteId.set(trip.route_id, []);
        }
        tripsByRouteId.get(trip.route_id)!.push(trip);
      });

      // Get all unique shape IDs from all trips
      const allShapeIds = [...new Set(allTrips.map(t => t.shape_id).filter(Boolean))] as string[];

      // Fetch all shapes in a single bulk call
      const allShapes = allShapeIds.length > 0 ? await getShapesBulk(allShapeIds) : [];

      // Group shapes by shape_id
      const shapesByShapeId = new Map<string, Shape[]>();
      allShapes.forEach(shape => {
        if (!shapesByShapeId.has(shape.shape_id)) {
          shapesByShapeId.set(shape.shape_id, []);
        }
        shapesByShapeId.get(shape.shape_id)!.push(shape);
      });

      // Fetch stops in parallel
      const stopPromises = stopItems.map(async item => {
        try {
          return { id: item.id, data: await getStop(item.id), error: undefined };
        } catch (err) {
          return { id: item.id, data: undefined, error: 'Failed to load' };
        }
      });
      const stopResults = await Promise.all(stopPromises);
      const stopsByStopId = new Map<string, Stop>();
      stopResults.forEach(result => {
        if (result.data) {
          stopsByStopId.set(result.id, result.data);
        }
      });

      // Build items array matching the original order
      const itemsWithData: GroupItemWithData[] = data.items.map(item => {
        if (item.type === GroupItemType.ROUTE) {
          const route = routesData.find(r => r.route_id === item.id);
          if (!route) {
            return { ...item, loading: false, error: 'Route not found' };
          }
          const trips = tripsByRouteId.get(item.id) || [];
          const routeShapeIds = [
            ...new Set(trips.map(t => t.shape_id).filter(Boolean)),
          ] as string[];
          const shapes = routeShapeIds.flatMap(shapeId => shapesByShapeId.get(shapeId) || []);
          return { ...item, loading: false, data: { ...route, shapes } };
        } else {
          const stop = stopsByStopId.get(item.id);
          const stopResult = stopResults.find(r => r.id === item.id);
          if (!stop) {
            return { ...item, loading: false, error: stopResult?.error || 'Stop not found' };
          }
          return { ...item, loading: false, data: stop };
        }
      });

      setItems(itemsWithData);
    } catch (err) {
      console.error('Error fetching group:', err);
      setError('Failed to load group details');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  // Save changes to group
  const handleSave = async () => {
    if (!group) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const updatedGroup = await updateGroup(group.group_id, {
        name: editName,
        description: editDescription || undefined,
        items: items.map(item => ({ type: item.type, id: item.id })),
      });
      setGroup(updatedGroup);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 403) {
          setSaveError('Permission denied: You need admin privileges to edit groups.');
        } else {
          setSaveError(err.response?.data?.message || 'Failed to save changes');
        }
      } else {
        setSaveError('An unexpected error occurred');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    if (group) {
      setEditName(group.name);
      setEditDescription(group.description || '');
      // Reset items to original
      const originalItems: GroupItemWithData[] = group.items.map(item => {
        const existingItem = items.find(i => i.type === item.type && i.id === item.id);
        return existingItem || { ...item, loading: true };
      });
      setItems(originalItems);
    }
    setIsEditing(false);
    setSaveError(null);
  };

  // Reorder handlers
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;

    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setItems(newItems);

    // Auto-save reorder
    if (group) {
      setIsSaving(true);
      try {
        await updateGroup(group.group_id, {
          items: newItems.map(item => ({ type: item.type, id: item.id })),
        });
      } catch (err) {
        console.error('Error saving reorder:', err);
        // Revert on error
        setItems(items);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= items.length - 1) return;

    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setItems(newItems);

    // Auto-save reorder
    if (group) {
      setIsSaving(true);
      try {
        await updateGroup(group.group_id, {
          items: newItems.map(item => ({ type: item.type, id: item.id })),
        });
      } catch (err) {
        console.error('Error saving reorder:', err);
        // Revert on error
        setItems(items);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleRemoveItem = async (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);

    // Auto-save removal
    if (group) {
      setIsSaving(true);
      try {
        await updateGroup(group.group_id, {
          items: newItems.map(item => ({ type: item.type, id: item.id })),
        });
      } catch (err) {
        console.error('Error saving removal:', err);
        // Revert on error
        setItems(items);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Drag and drop reorder handler
  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    setItems(newItems);

    // Auto-save reorder
    if (group) {
      setIsSaving(true);
      try {
        await updateGroup(group.group_id, {
          items: newItems.map(item => ({ type: item.type, id: item.id })),
        });
      } catch (err) {
        console.error('Error saving reorder:', err);
        // Revert on error
        setItems(items);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Add item handlers
  const handleAddStop = async (stopId: string) => {
    // Check if already exists
    if (items.some(item => item.type === GroupItemType.STOP && item.id === stopId)) {
      return;
    }

    // Add with loading state
    const newItem: GroupItemWithData = {
      type: GroupItemType.STOP,
      id: stopId,
      loading: true,
    };
    const newItems = [...items, newItem];
    setItems(newItems);

    // Fetch stop data
    try {
      const stop = await getStop(stopId);
      setItems(prev =>
        prev.map(item =>
          item.type === GroupItemType.STOP && item.id === stopId
            ? { ...item, loading: false, data: stop }
            : item
        )
      );
    } catch (err) {
      setItems(prev =>
        prev.map(item =>
          item.type === GroupItemType.STOP && item.id === stopId
            ? { ...item, loading: false, error: 'Failed to load' }
            : item
        )
      );
    }

    // Save to server
    if (group) {
      setIsSaving(true);
      try {
        await updateGroup(group.group_id, {
          items: newItems.map(item => ({ type: item.type, id: item.id })),
        });
      } catch (err) {
        console.error('Error adding stop:', err);
        // Revert on error
        setItems(items);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleAddRoute = async (routeId: string) => {
    // Check if already exists
    if (items.some(item => item.type === GroupItemType.ROUTE && item.id === routeId)) {
      return;
    }

    // Add with loading state
    const newItem: GroupItemWithData = {
      type: GroupItemType.ROUTE,
      id: routeId,
      loading: true,
    };
    const newItems = [...items, newItem];
    setItems(newItems);

    // Fetch route data with shapes
    try {
      const route = await getRoute(routeId);
      const trips = await getTripsForRoute(routeId);
      const shapeIds = [...new Set(trips.map((t: Trip) => t.shape_id).filter(Boolean))] as string[];
      const shapes = shapeIds.length > 0 ? await getShapesBulk(shapeIds) : [];
      const routeWithShapes: RouteWithShapes = { ...route, shapes };
      setItems(prev =>
        prev.map(item =>
          item.type === GroupItemType.ROUTE && item.id === routeId
            ? { ...item, loading: false, data: routeWithShapes }
            : item
        )
      );
    } catch (err) {
      setItems(prev =>
        prev.map(item =>
          item.type === GroupItemType.ROUTE && item.id === routeId
            ? { ...item, loading: false, error: 'Failed to load' }
            : item
        )
      );
    }

    // Save to server
    if (group) {
      setIsSaving(true);
      try {
        await updateGroup(group.group_id, {
          items: newItems.map(item => ({ type: item.type, id: item.id })),
        });
      } catch (err) {
        console.error('Error adding route:', err);
        // Revert on error
        setItems(items);
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading group details...</span>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/groups')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Groups
        </Button>
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
          <AlertCircle className="w-5 h-5" />
          <span>{error || 'Group not found'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="shrink-0 border-b p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/groups')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Group name"
                  className="text-lg font-bold"
                />
                <Input
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Description (optional)"
                />
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold">{group.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {group.description || group.group_id}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}

            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving || !editName.trim()}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {saveError && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {saveError}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <GroupMap items={items} />
        </div>

        {/* Sidebar - Items List */}
        <div className="w-[600px] border-l flex flex-col bg-background">
          <div className="flex-1 overflow-y-auto p-4">
            <AddItemForm onAddStop={handleAddStop} onAddRoute={handleAddRoute} />

            <div className="py-4">
              <h2 className="font-semibold">Items ({items.length})</h2>
            </div>

            <GroupItemsList
              items={items}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onRemove={handleRemoveItem}
              onReorder={handleReorder}
              isReordering={isSaving}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
