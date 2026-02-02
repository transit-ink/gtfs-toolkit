import { Input } from '@/components/ui/input';
import { searchRoutes } from '@/services/routes';
import { RouteSearchResult } from '@/types/gtfs';
import { Loader2, Route as RouteIcon, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Throttle delay in milliseconds
const THROTTLE_DELAY = 300;

function getRouteTypeLabel(routeType: number): string {
  const types: Record<number, string> = {
    0: 'Tram',
    1: 'Subway',
    2: 'Rail',
    3: 'Bus',
    4: 'Ferry',
    5: 'Cable Tram',
    6: 'Aerial Lift',
    7: 'Funicular',
    800: 'Trolleybus',
    900: 'Monorail',
  };
  return types[routeType] || 'Unknown';
}

interface RouteResultCardProps {
  result: RouteSearchResult;
  onRouteClick: (routeId: string) => void;
}

function RouteResultCard({ result, onRouteClick }: RouteResultCardProps) {
  const route = result.route;
  return (
    <div
      onClick={() => onRouteClick(route.route_id)}
      className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
    >
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 px-3 py-1.5 rounded-md font-bold text-lg min-w-[80px] text-center"
          style={{
            backgroundColor: route.route_color ? `#${route.route_color}` : '#6b7280',
            color: route.route_text_color ? `#${route.route_text_color}` : '#ffffff',
          }}
        >
          {route.route_short_name}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{route.route_long_name}</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{getRouteTypeLabel(route.route_type)}</span>
            <span>•</span>
            <span className="font-mono text-xs">{route.route_id}</span>
          </div>
          {route.route_desc && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {route.route_desc}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RoutesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RouteSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for throttling
  const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchRef = useRef<string>('');

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    // Avoid duplicate searches
    if (searchQuery === lastSearchRef.current) {
      return;
    }
    lastSearchRef.current = searchQuery;

    setIsLoading(true);
    setError(null);

    try {
      const data = await searchRoutes(searchQuery);
      setResults(data);
    } catch (err) {
      console.error('Error searching routes:', err);
      setError('Failed to search routes. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Throttled search effect
  useEffect(() => {
    // Clear any existing timeout
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    // Set up new throttled search
    throttleTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, THROTTLE_DELAY);

    // Cleanup on unmount or query change
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  const handleRouteClick = (routeId: string) => {
    navigate(`/routes/${encodeURIComponent(routeId)}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Routes</h1>
        <p className="text-muted-foreground">Search for routes by route number or name</p>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search routes (e.g., 500, 401K)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          autoFocus
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 mb-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {query.trim() && !isLoading && results.length === 0 && !error && (
        <div className="text-center py-12 text-muted-foreground">
          <RouteIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No routes found for "{query}"</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result) => (
            <RouteResultCard
              key={result.route.route_id}
              result={result}
              onRouteClick={handleRouteClick}
            />
          ))}
        </div>
      )}

      {/* Empty state when no search */}
      {!query.trim() && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Start typing to search for routes</p>
        </div>
      )}
    </div>
  );
}
