import { Button } from '@/components/ui/button';
import { GroupItemType } from '@/services/groups';
import { Route, Stop } from '@/types/gtfs';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  GripVertical,
  Loader2,
  MapPin,
  Route as RouteIcon,
  Trash2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GroupItemWithData } from './types';

type DropPosition = 'above' | 'below' | null;

interface GroupItemRowProps {
  item: GroupItemWithData;
  index: number;
  itemsLength: number;
  dropTarget: { index: number; position: DropPosition } | null;
  draggedIndex: number | null;
  isReordering: boolean;
  itemDisplay: React.ReactNode;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onNavigate: (item: GroupItemWithData) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
}

function GroupItemRow({
  item,
  index,
  itemsLength,
  dropTarget,
  draggedIndex,
  isReordering,
  itemDisplay,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onNavigate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: GroupItemRowProps) {
  const dropAbove = dropTarget?.index === index && dropTarget.position === 'above';
  const dropBelow = dropTarget?.index === index && dropTarget.position === 'below';
  return (
    <div className="relative">
      {dropAbove && (
        <div className="absolute -top-1.5 left-0 right-0 h-0.5 bg-primary rounded-full z-10">
          <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-primary rounded-full" />
          <div className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-primary rounded-full" />
        </div>
      )}
      <div
        draggable={!isReordering}
        onDragStart={(e) => onDragStart(e, index)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, index)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, index)}
        className={`flex items-center gap-2 p-3 border rounded-lg bg-card transition-all hover:bg-accent/50 ${
          draggedIndex === index ? 'opacity-50' : ''
        }`}
      >
        <div
          className="shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
          {index + 1}
        </div>
        {itemDisplay}
        <div className="shrink-0 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onNavigate(item)}
            title={`Go to ${item.type}`}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMoveUp(index)}
            disabled={index === 0 || isReordering}
            title="Move up"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMoveDown(index)}
            disabled={index === itemsLength - 1 || isReordering}
            title="Move down"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onRemove(index)}
            disabled={isReordering}
            title="Remove from group"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {dropBelow && (
        <div className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-primary rounded-full z-10">
          <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-primary rounded-full" />
          <div className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-primary rounded-full" />
        </div>
      )}
    </div>
  );
}

interface GroupItemsListProps {
  items: GroupItemWithData[];
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  isReordering: boolean;
}

export function GroupItemsList({
  items,
  onMoveUp,
  onMoveDown,
  onRemove,
  onReorder,
  isReordering,
}: GroupItemsListProps) {
  const navigate = useNavigate();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; position: DropPosition } | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleNavigateToItem = (item: GroupItemWithData) => {
    if (item.type === GroupItemType.STOP) {
      // Navigate to stops page - we don't have a dedicated stop details page
      navigate('/stops');
    } else if (item.type === GroupItemType.ROUTE) {
      navigate(`/routes/${encodeURIComponent(item.id)}`);
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    
    // Add a slight delay to allow the drag image to be set
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDropTarget(null);
    dragNodeRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex === null || draggedIndex === index) {
      setDropTarget(null);
      return;
    }

    // Determine if dropping above or below based on mouse position
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: DropPosition = e.clientY < midY ? 'above' : 'below';
    
    setDropTarget({ index, position });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    const fromIndex = draggedIndex;
    
    if (fromIndex === null || !dropTarget) {
      setDraggedIndex(null);
      setDropTarget(null);
      return;
    }

    // Calculate the actual target index based on drop position
    let toIndex = index;
    if (dropTarget.position === 'below') {
      toIndex = index + 1;
    }
    
    // Adjust if moving from above to below
    if (fromIndex < toIndex) {
      toIndex -= 1;
    }

    if (fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }
    
    setDraggedIndex(null);
    setDropTarget(null);
  };

  const getStopDisplay = (stop: Stop) => {
    return (
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0 p-2 rounded-md bg-blue-500/10 text-blue-500">
          <MapPin className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{stop.stop_name}</p>
          <p className="text-xs text-muted-foreground font-mono">{stop.stop_id}</p>
        </div>
      </div>
    );
  };

  const getRouteDisplay = (route: Route) => {
    return (
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="shrink-0 px-2 py-1 rounded text-sm font-bold min-w-[60px] text-center"
          style={{
            backgroundColor: route.route_color ? `#${route.route_color}` : '#6b7280',
            color: route.route_text_color ? `#${route.route_text_color}` : '#ffffff',
          }}
        >
          {route.route_short_name}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{route.route_long_name}</p>
          <p className="text-xs text-muted-foreground font-mono">{route.route_id}</p>
        </div>
      </div>
    );
  };

  const getItemDisplay = (item: GroupItemWithData) => {
    if (item.loading) {
      return (
        <div className="flex items-center gap-3 flex-1">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      );
    }

    if (item.error || !item.data) {
      return (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="shrink-0 p-2 rounded-md bg-muted text-muted-foreground">
            {item.type === GroupItemType.STOP ? (
              <MapPin className="w-4 h-4" />
            ) : (
              <RouteIcon className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-muted-foreground">
              {item.type === GroupItemType.STOP ? 'Stop' : 'Route'} not found
            </p>
            <p className="text-xs text-muted-foreground font-mono">{item.id}</p>
          </div>
        </div>
      );
    }

    if (item.type === GroupItemType.STOP) {
      return getStopDisplay(item.data as Stop);
    } else {
      return getRouteDisplay(item.data as Route);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No items in this group yet.</p>
        <p className="text-sm mt-1">Add stops or routes to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <GroupItemRow
          key={`${item.type}-${item.id}-${index}`}
          item={item}
          index={index}
          itemsLength={items.length}
          dropTarget={dropTarget}
          draggedIndex={draggedIndex}
          isReordering={isReordering}
          itemDisplay={getItemDisplay(item)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onNavigate={handleNavigateToItem}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
