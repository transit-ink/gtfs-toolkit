import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChevronDown,
  ChevronRight,
  FileEdit,
  GitBranch,
  MapPin,
  Plus,
  Route,
  Trash2,
} from 'lucide-react';
import {
  Change,
  ChangeOperation,
  EntityType,
} from '@/services/changesets';

const entityTypeConfig: Record<
  EntityType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  [EntityType.AGENCY]: {
    label: 'Agency',
    icon: <GitBranch className="w-4 h-4" />,
    color: 'text-purple-600',
  },
  [EntityType.STOP]: {
    label: 'Stop',
    icon: <MapPin className="w-4 h-4" />,
    color: 'text-blue-600',
  },
  [EntityType.ROUTE]: {
    label: 'Route',
    icon: <Route className="w-4 h-4" />,
    color: 'text-green-600',
  },
  [EntityType.TRIP]: {
    label: 'Trip',
    icon: <GitBranch className="w-4 h-4" />,
    color: 'text-orange-600',
  },
  [EntityType.STOP_TIME]: {
    label: 'Stop Time',
    icon: <MapPin className="w-4 h-4" />,
    color: 'text-cyan-600',
  },
  [EntityType.CALENDAR]: {
    label: 'Calendar',
    icon: <GitBranch className="w-4 h-4" />,
    color: 'text-pink-600',
  },
  [EntityType.CALENDAR_DATE]: {
    label: 'Calendar Date',
    icon: <GitBranch className="w-4 h-4" />,
    color: 'text-rose-600',
  },
  [EntityType.SHAPE]: {
    label: 'Shape',
    icon: <Route className="w-4 h-4" />,
    color: 'text-amber-600',
  },
};

const operationConfig: Record<
  ChangeOperation,
  { label: string; icon: React.ReactNode; bgColor: string; textColor: string }
> = {
  [ChangeOperation.CREATE]: {
    label: 'Create',
    icon: <Plus className="w-3 h-3" />,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  [ChangeOperation.UPDATE]: {
    label: 'Update',
    icon: <FileEdit className="w-3 h-3" />,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  [ChangeOperation.DELETE]: {
    label: 'Delete',
    icon: <Trash2 className="w-3 h-3" />,
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
};

interface EntityChangeCardProps {
  change: Change;
  routeNames?: Record<string, string>;
  stopNames?: Record<string, string>;
  tripNames?: Record<string, string>;
  compact?: boolean;
  onClick?: () => void;
}

function getDisplayName(data: Record<string, unknown> | null, entityType: EntityType): string {
  if (!data) return 'Unknown';
  
  switch (entityType) {
    case EntityType.STOP:
      return (data.stop_name as string) || (data.stop_id as string) || 'Unknown Stop';
    case EntityType.ROUTE:
      return (data.route_short_name as string) || (data.route_long_name as string) || (data.route_id as string) || 'Unknown Route';
    case EntityType.TRIP:
      return (data.trip_headsign as string) || (data.trip_id as string) || 'Unknown Trip';
    case EntityType.AGENCY:
      return (data.agency_name as string) || (data.agency_id as string) || 'Unknown Agency';
    case EntityType.STOP_TIME:
      return `${data.arrival_time || ''} - ${data.departure_time || ''}`.trim() || 'Unknown Time';
    default:
      return String(data.id || data.service_id || 'Unknown');
  }
}

function FieldDiff({ 
  field, 
  oldValue, 
  newValue 
}: { 
  field: string; 
  oldValue: unknown; 
  newValue: unknown; 
}) {
  const formatValue = (val: unknown) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);

  if (!hasChanged) {
    return (
      <div className="flex justify-between text-xs py-0.5">
        <span className="text-muted-foreground">{field}:</span>
        <span>{formatValue(newValue)}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col text-xs py-0.5">
      <span className="text-muted-foreground">{field}:</span>
      <div className="flex items-center gap-2 ml-2">
        {oldValue !== undefined && (
          <span className="line-through text-red-600/70">{formatValue(oldValue)}</span>
        )}
        {oldValue !== undefined && newValue !== undefined && (
          <span className="text-muted-foreground">→</span>
        )}
        {newValue !== undefined && (
          <span className="text-green-600">{formatValue(newValue)}</span>
        )}
      </div>
    </div>
  );
}

export function EntityChangeCard({
  change,
  routeNames = {},
  stopNames = {},
  tripNames = {},
  compact = false,
  onClick,
}: EntityChangeCardProps) {
  const [expanded, setExpanded] = useState(false);

  const entityConfig = entityTypeConfig[change.entity_type];
  const opConfig = operationConfig[change.operation];

  // Build context breadcrumb
  const contextParts: string[] = [];
  if (change.related_route_id) {
    contextParts.push(routeNames[change.related_route_id] || `Route ${change.related_route_id}`);
  }
  if (change.related_trip_id) {
    contextParts.push(tripNames[change.related_trip_id] || `Trip ${change.related_trip_id}`);
  }
  if (change.related_stop_id && change.entity_type !== EntityType.STOP) {
    contextParts.push(stopNames[change.related_stop_id] || `Stop ${change.related_stop_id}`);
  }

  // Get display name from the data
  const displayName = change.operation === ChangeOperation.DELETE
    ? getDisplayName(change.old_data, change.entity_type)
    : getDisplayName(change.new_data, change.entity_type);

  // Compute diff fields for UPDATE operations
  const diffFields: { field: string; oldValue: unknown; newValue: unknown }[] = [];
  if (change.operation === ChangeOperation.UPDATE && change.old_data && change.new_data) {
    const allKeys = new Set([
      ...Object.keys(change.old_data),
      ...Object.keys(change.new_data),
    ]);
    allKeys.forEach((key) => {
      // Skip internal fields
      if (['id', 'created_at', 'updated_at'].includes(key)) return;
      
      const oldVal = change.old_data?.[key];
      const newVal = change.new_data?.[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diffFields.push({ field: key, oldValue: oldVal, newValue: newVal });
      }
    });
  }

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 p-2 rounded-md border hover:bg-accent cursor-pointer ${onClick ? '' : ''}`}
        onClick={onClick}
      >
        <div className={`p-1.5 rounded ${opConfig.bgColor}`}>
          {opConfig.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={entityConfig.color}>{entityConfig.icon}</span>
            <span className="font-medium text-sm truncate">{displayName}</span>
          </div>
          {contextParts.length > 0 && (
            <div className="text-xs text-muted-foreground truncate">
              {contextParts.join(' → ')}
            </div>
          )}
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded ${opConfig.bgColor} ${opConfig.textColor}`}>
          {opConfig.label}
        </span>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${opConfig.bgColor}`}>
              <span className={opConfig.textColor}>{entityConfig.icon}</span>
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span>{opConfig.label}</span>
                <span className={entityConfig.color}>{entityConfig.label}</span>
              </CardTitle>
              <CardDescription className="mt-0.5">
                {displayName}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Context breadcrumb */}
        {contextParts.length > 0 && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            {contextParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3" />}
                <span className="bg-secondary px-1.5 py-0.5 rounded">{part}</span>
              </span>
            ))}
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="border-t pt-3 mt-1">
            {change.operation === ChangeOperation.CREATE && change.new_data && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground mb-2">New Values:</div>
                {Object.entries(change.new_data)
                  .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
                  .map(([key, value]) => (
                    <FieldDiff key={key} field={key} oldValue={undefined} newValue={value} />
                  ))}
              </div>
            )}

            {change.operation === ChangeOperation.UPDATE && diffFields.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground mb-2">Changed Fields:</div>
                {diffFields.map(({ field, oldValue, newValue }) => (
                  <FieldDiff key={field} field={field} oldValue={oldValue} newValue={newValue} />
                ))}
              </div>
            )}

            {change.operation === ChangeOperation.DELETE && change.old_data && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground mb-2">Deleted Values:</div>
                {Object.entries(change.old_data)
                  .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
                  .map(([key, value]) => (
                    <FieldDiff key={key} field={key} oldValue={value} newValue={undefined} />
                  ))}
              </div>
            )}

            <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
              Entity ID: <span className="font-mono">{change.entity_id}</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Group changes by their parent entity for hierarchical display
export interface GroupedChanges {
  route?: Change;
  trips: Map<string, { trip?: Change; stopTimes: Change[] }>;
  stops: Change[];
  other: Change[];
}

export function groupChangesByEntity(changes: Change[]): GroupedChanges {
  const result: GroupedChanges = {
    route: undefined,
    trips: new Map(),
    stops: [],
    other: [],
  };

  changes.forEach((change) => {
    switch (change.entity_type) {
      case EntityType.ROUTE:
        result.route = change;
        break;
      case EntityType.TRIP:
        const tripEntry = result.trips.get(change.entity_id) || { trip: undefined, stopTimes: [] };
        tripEntry.trip = change;
        result.trips.set(change.entity_id, tripEntry);
        break;
      case EntityType.STOP_TIME:
        if (change.related_trip_id) {
          const existingTrip = result.trips.get(change.related_trip_id) || { trip: undefined, stopTimes: [] };
          existingTrip.stopTimes.push(change);
          result.trips.set(change.related_trip_id, existingTrip);
        } else {
          result.other.push(change);
        }
        break;
      case EntityType.STOP:
        result.stops.push(change);
        break;
      default:
        result.other.push(change);
    }
  });

  return result;
}

interface ChangesetHierarchyProps {
  changes: Change[];
  routeNames?: Record<string, string>;
  stopNames?: Record<string, string>;
  tripNames?: Record<string, string>;
}

export function ChangesetHierarchy({
  changes,
  routeNames = {},
  stopNames = {},
  tripNames = {},
}: ChangesetHierarchyProps) {
  const grouped = groupChangesByEntity(changes);

  return (
    <div className="space-y-3">
      {/* Route change */}
      {grouped.route && (
        <EntityChangeCard
          change={grouped.route}
          routeNames={routeNames}
          stopNames={stopNames}
          tripNames={tripNames}
        />
      )}

      {/* Trip changes with their stop times */}
      {Array.from(grouped.trips.entries()).map(([tripId, { trip, stopTimes }]) => (
        <div key={tripId} className="space-y-2">
          {trip && (
            <EntityChangeCard
              change={trip}
              routeNames={routeNames}
              stopNames={stopNames}
              tripNames={tripNames}
            />
          )}
          {stopTimes.length > 0 && (
            <div className="ml-4 space-y-2 border-l-2 border-cyan-200 pl-3">
              {stopTimes.map((st) => (
                <EntityChangeCard
                  key={st.id}
                  change={st}
                  routeNames={routeNames}
                  stopNames={stopNames}
                  tripNames={tripNames}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Stop changes */}
      {grouped.stops.length > 0 && (
        <div className="space-y-2">
          {grouped.stops.map((stop) => (
            <EntityChangeCard
              key={stop.id}
              change={stop}
              routeNames={routeNames}
              stopNames={stopNames}
              tripNames={tripNames}
            />
          ))}
        </div>
      )}

      {/* Other changes */}
      {grouped.other.length > 0 && (
        <div className="space-y-2">
          {grouped.other.map((change) => (
            <EntityChangeCard
              key={change.id}
              change={change}
              routeNames={routeNames}
              stopNames={stopNames}
              tripNames={tripNames}
            />
          ))}
        </div>
      )}
    </div>
  );
}
