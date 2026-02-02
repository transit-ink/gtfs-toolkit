import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchRoutes } from '@/services/routes';
import { RouteSearchResult } from '@/types/gtfs';
import { Loader2, MapPin, Plus, Route, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type ItemType = 'stop' | 'route';

function AddItemRouteResultRow({
  result,
  onAdd,
}: {
  result: RouteSearchResult;
  onAdd: (routeId: string) => void;
}) {
  const route = result.route;
  return (
    <div
      onClick={() => onAdd(route.route_id)}
      className="p-2.5 border rounded-md cursor-pointer hover:bg-accent transition-colors"
    >
      <div className="flex items-center gap-2">
        <div
          className="shrink-0 px-2 py-0.5 rounded text-xs font-bold"
          style={{
            backgroundColor: route.route_color ? `#${route.route_color}` : '#6b7280',
            color: route.route_text_color ? `#${route.route_text_color}` : '#ffffff',
          }}
        >
          {route.route_short_name}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{route.route_long_name}</p>
        </div>
      </div>
    </div>
  );
}

interface AddItemFormProps {
  onAddStop: (stopId: string) => void;
  onAddRoute: (routeId: string) => void;
}

export function AddItemForm({ onAddStop, onAddRoute }: AddItemFormProps) {
  const [itemType, setItemType] = useState<ItemType>('stop');
  const [searchQuery, setSearchQuery] = useState('');
  const [stopId, setStopId] = useState('');
  const [routeResults, setRouteResults] = useState<RouteSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search routes with throttle
  const searchRoutesThrottled = useCallback(async (query: string) => {
    if (!query.trim()) {
      setRouteResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchRoutes(query);
      setRouteResults(results);
    } catch (err) {
      console.error('Error searching routes:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (itemType !== 'route') return;

    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }

    throttleRef.current = setTimeout(() => {
      searchRoutesThrottled(searchQuery);
    }, 300);

    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [searchQuery, itemType, searchRoutesThrottled]);

  const handleAddStop = () => {
    if (stopId.trim()) {
      onAddStop(stopId.trim());
      setStopId('');
    }
  };

  const handleAddRoute = (routeId: string) => {
    onAddRoute(routeId);
    setSearchQuery('');
    setRouteResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && itemType === 'stop' && stopId.trim()) {
      handleAddStop();
    }
  };

  return (
    <div className="border-b pb-4">
      <p className="text-sm font-medium mb-3 text-muted-foreground">Add Item</p>

      {/* Item Type Selector */}
      <div className="flex gap-2 mb-3">
        <Button
          variant={itemType === 'stop' ? 'default' : 'outline'}
          onClick={() => setItemType('stop')}
          size="sm"
          className="flex-1"
        >
          <MapPin className="w-3.5 h-3.5 mr-1.5" />
          Stop
        </Button>
        <Button
          variant={itemType === 'route' ? 'default' : 'outline'}
          onClick={() => setItemType('route')}
          size="sm"
          className="flex-1"
        >
          <Route className="w-3.5 h-3.5 mr-1.5" />
          Route
        </Button>
      </div>

      {/* Stop Input */}
      {itemType === 'stop' && (
        <div className="flex gap-2">
          <Input
            placeholder="Enter stop ID..."
            value={stopId}
            onChange={e => setStopId(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button onClick={handleAddStop} disabled={!stopId.trim()} size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Route Search */}
      {itemType === 'route' && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search routes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Route Results */}
          {searchQuery.trim() && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {!isSearching && routeResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">No routes found</p>
              )}
              {routeResults.map(result => (
                <AddItemRouteResultRow
                  key={result.route.route_id}
                  result={result}
                  onAdd={handleAddRoute}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
