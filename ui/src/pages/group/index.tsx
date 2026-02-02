import { Bus, Layers, MapPin } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CircleLoaderBlock } from '../../components/circleLoader';
import GroupMap from '../../components/groupMap';
import Sidebar from '../../components/sidebar';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Route, Shape, Stop } from '../../types/gtfs';
import { Group, GroupItemType, useGroupDetails } from '../../utils/api';

interface RouteData {
  route: Route;
  shapes: Shape[];
}

interface GroupDetails {
  group: Group;
  routes: RouteData[];
  stops: Stop[];
}

interface GroupItemRowProps {
  item: {
    type: GroupItemType;
    id: string;
    data: Route | Stop | undefined;
  };
}

function GroupItemRow({ item }: GroupItemRowProps) {
  const isRoute = item.type === GroupItemType.ROUTE;

  if (isRoute) {
    const route = item.data as Route | undefined;
    return (
      <Link
        to={`/route/${item.id}`}
        className="flex items-center gap-3 relative hover:bg-accent rounded-lg p-2 -ml-1 transition-colors"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-green-100">
          <Bus className="w-4 h-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          {route ? (
            <>
              <span className="font-medium block">{route.route_short_name}</span>
              <span className="text-sm text-muted-foreground truncate block">
                {route.route_long_name}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">{item.id} (not found)</span>
          )}
        </div>
      </Link>
    );
  }

  const stop = item.data as Stop | undefined;
  return (
    <Link
      to={`/stop/${item.id}`}
      className="flex items-center gap-3 relative hover:bg-accent rounded-lg p-2 -ml-1 transition-colors"
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-red-100">
        <MapPin className="w-4 h-4 text-red-600" />
      </div>
      <div className="flex-1 min-w-0">
        {stop ? (
          <>
            <span className="font-medium block truncate">{stop.stop_name}</span>
            {stop.stop_code && (
              <span className="text-sm text-muted-foreground">
                Code: {stop.stop_code}
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">{item.id} (not found)</span>
        )}
      </div>
    </Link>
  );
}

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { data, isPending: loading, isError } = useGroupDetails(groupId);
  const details: GroupDetails | null = data ?? null;
  const error = isError ? 'Failed to load group. It may not exist.' : null;

  usePageMeta({
    title: details ? details.group.name : 'Group',
    description: details?.group.description || 'View group of routes and stops on a map.',
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-4">
          <div className="flex items-center gap-3">
            <Sidebar />
            <Layers className="w-5 h-5 shrink-0" />
            <h1 className="font-semibold">Group</h1>
          </div>
        </div>
        <div className="h-14" />
        <CircleLoaderBlock text="Loading group..." />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-4">
          <div className="flex items-center gap-3">
            <Sidebar />
            <Layers className="w-5 h-5 shrink-0" />
            <h1 className="font-semibold">Group</h1>
          </div>
        </div>
        <div className="h-14" />
        <div className="p-4 py-8 text-center text-muted-foreground">
          {error || 'Group not found'}
        </div>
      </div>
    );
  }

  // Get the ordered list of items with their data
  const orderedItems = details.group.items.map((item, index) => {
    if (item.type === GroupItemType.ROUTE) {
      const routeData = details.routes.find(r => r.route.route_id === item.id);
      return {
        ...item,
        data: routeData?.route,
        order: index + 1,
      };
    } else {
      const stop = details.stops.find(s => s.stop_id === item.id);
      return {
        ...item,
        data: stop,
        order: index + 1,
      };
    }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-4">
        <div className="flex items-center gap-3">
          <Sidebar />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* <Layers className="w-4 h-4 shrink-0" /> */}
              <h1 className="font-semibold truncate">{details.group.name}</h1>
            </div>
            {details.group.description && (
              <p className="text-primary-foreground/80 text-xs truncate">
                {details.group.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-14" />

      {/* Map - Full width, 70vh height */}
      <div className="h-[70vh]">
        <GroupMap routes={details.routes} stops={details.stops} />
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Legend / Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Bus className="w-4 h-4" />
            <span>{details.routes.length} routes</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{details.stops.length} places</span>
          </div>
        </div>

        {/* Items list */}
        <section>
          <div className="relative">
            {/* Items */}
            <div className="space-y-1">
              {orderedItems.map(item => (
                <GroupItemRow key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
