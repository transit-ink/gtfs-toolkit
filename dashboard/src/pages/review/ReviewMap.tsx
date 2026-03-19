import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Change, ChangeOperation, Changeset, EntityType } from '@/services/changesets';
import { currentInstance } from '@/utils/constants';
import { Loader2, Maximize2, Minimize2, User, X } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

// Color palette for different changesets/authors
const CHANGESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#0ea5e9', // sky
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
  '#8b5cf6', // violet
];

interface ChangesetMarkerData {
  changesetId: string;
  authorName: string;
  color: string;
  lat: number;
  lon: number;
  changes: Change[];
  entityType: EntityType;
  operation: ChangeOperation;
  entityId: string;
  displayName: string;
}

function getLocationFromChange(change: Change): { lat: number; lon: number } | null {
  const data = change.operation === ChangeOperation.DELETE ? change.old_data : change.new_data;

  if (!data) return null;

  // For stops, get lat/lon directly
  if (change.entity_type === EntityType.STOP) {
    const lat = data.stop_lat as number;
    const lon = data.stop_lon as number;
    if (lat && lon) {
      return { lat: Number(lat), lon: Number(lon) };
    }
  }

  // For shapes, try to get a point
  if (change.entity_type === EntityType.SHAPE) {
    const lat = data.shape_pt_lat as number;
    const lon = data.shape_pt_lon as number;
    if (lat && lon) {
      return { lat: Number(lat), lon: Number(lon) };
    }
  }

  return null;
}

function getDisplayNameFromChange(change: Change): string {
  const data = change.operation === ChangeOperation.DELETE ? change.old_data : change.new_data;

  if (!data) return change.entity_id;

  switch (change.entity_type) {
    case EntityType.STOP:
      return (data.stop_name as string) || change.entity_id;
    case EntityType.ROUTE:
      return (
        (data.route_short_name as string) || (data.route_long_name as string) || change.entity_id
      );
    case EntityType.TRIP:
      return (data.trip_headsign as string) || change.entity_id;
    default:
      return change.entity_id;
  }
}

interface ReviewMapProps {
  changesets: Changeset[];
  selectedChangesetId: string | null;
  onSelectChangeset: (id: string | null) => void;
  isLoading?: boolean;
}

export function ReviewMap({
  changesets,
  selectedChangesetId,
  onSelectChangeset,
  isLoading = false,
}: ReviewMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  // const [hoveredMarker, setHoveredMarker] = useState<ChangesetMarkerData | null>(null);

  // Build color map for changesets
  const changesetColorMap = useMemo(() => {
    const map = new Map<string, string>();
    changesets.forEach((cs, index) => {
      map.set(cs.id, CHANGESET_COLORS[index % CHANGESET_COLORS.length]);
    });
    return map;
  }, [changesets]);

  // Extract all mappable changes from changesets
  const markerData = useMemo(() => {
    const markers: ChangesetMarkerData[] = [];

    changesets.forEach(changeset => {
      const color = changesetColorMap.get(changeset.id) || CHANGESET_COLORS[0];

      changeset.changes.forEach(change => {
        const location = getLocationFromChange(change);
        if (location) {
          markers.push({
            changesetId: changeset.id,
            authorName: changeset.user?.username || 'Unknown',
            color,
            lat: location.lat,
            lon: location.lon,
            changes: [change],
            entityType: change.entity_type,
            operation: change.operation,
            entityId: change.entity_id,
            displayName: getDisplayNameFromChange(change),
          });
        }
      });
    });

    return markers;
  }, [changesets, changesetColorMap]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [currentInstance.mapCenter[0], currentInstance.mapCenter[1]],
      zoom: 11,
      minZoom: 6,
      maxZoom: 19,
    });

    map.current.dragRotate.disable();
    map.current.touchZoomRotate.disableRotation();

    map.current.on('load', () => {
      setMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Create popup helper
  const showPopup = useCallback((marker: ChangesetMarkerData, lngLat: [number, number]) => {
    if (!map.current) return;

    if (popupRef.current) {
      popupRef.current.remove();
    }

    const opLabel =
      marker.operation === ChangeOperation.CREATE
        ? 'Create'
        : marker.operation === ChangeOperation.UPDATE
          ? 'Update'
          : 'Delete';

    const entityLabel =
      marker.entityType === EntityType.STOP
        ? 'Stop'
        : marker.entityType === EntityType.SHAPE
          ? 'Shape'
          : marker.entityType;

    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 25,
    })
      .setLngLat(lngLat)
      .setHTML(
        `
        <div style="padding: 8px; min-width: 150px;">
          <div style="font-weight: 600; margin-bottom: 4px;">${marker.displayName}</div>
          <div style="font-size: 12px; color: #666;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${marker.color}; margin-right: 4px;"></span>
            ${marker.authorName}
          </div>
          <div style="font-size: 11px; color: #888; margin-top: 4px;">
            ${opLabel} ${entityLabel}
          </div>
        </div>
      `
      )
      .addTo(map.current);
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Remove old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Add new markers
    markerData.forEach((data, index) => {
      const isSelected = data.changesetId === selectedChangesetId;
      const el = document.createElement('div');

      // Different shapes for different operations
      const size = isSelected ? 28 : 20;
      const opShape =
        data.operation === ChangeOperation.CREATE
          ? 'circle'
          : data.operation === ChangeOperation.UPDATE
            ? 'square'
            : 'diamond';

      if (opShape === 'circle') {
        el.innerHTML = `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="${data.color}" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="4" fill="white"/>
          </svg>
        `;
      } else if (opShape === 'square') {
        el.innerHTML = `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="20" height="20" rx="3" fill="${data.color}" stroke="white" stroke-width="2"/>
            <rect x="8" y="8" width="8" height="8" rx="1" fill="white"/>
          </svg>
        `;
      } else {
        el.innerHTML = `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="${data.color}" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="white"/>
          </svg>
        `;
      }

      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.15s ease';

      if (isSelected) {
        el.style.transform = 'scale(1.3)';
        el.style.zIndex = '10';
      }

      el.addEventListener('mouseenter', () => {
        // setHoveredMarker(data);
        showPopup(data, [data.lon, data.lat]);
        if (!isSelected) {
          el.style.transform = 'scale(1.2)';
        }
      });

      el.addEventListener('mouseleave', () => {
        // setHoveredMarker(null);
        popupRef.current?.remove();
        if (!isSelected) {
          el.style.transform = 'scale(1)';
        }
      });

      el.addEventListener('click', e => {
        e.stopPropagation();
        onSelectChangeset(data.changesetId);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([data.lon, data.lat])
        .addTo(map.current!);

      markersRef.current.set(`${data.changesetId}-${index}`, marker);
    });

    // Fit bounds to show all markers
    if (markerData.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      markerData.forEach(data => {
        bounds.extend([data.lon, data.lat]);
      });

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
        duration: 500,
      });
    }
  }, [markerData, mapReady, selectedChangesetId, onSelectChangeset, showPopup]);

  // Legend for the map
  const uniqueAuthors = useMemo(() => {
    const authors = new Map<string, { name: string; color: string; count: number }>();
    changesets.forEach(cs => {
      const color = changesetColorMap.get(cs.id) || CHANGESET_COLORS[0];
      const existing = authors.get(cs.user_id);
      if (existing) {
        existing.count++;
      } else {
        authors.set(cs.user_id, {
          name: cs.user?.username || 'Unknown',
          color,
          count: 1,
        });
      }
    });
    return Array.from(authors.values());
  }, [changesets, changesetColorMap]);

  const containerClasses = isExpanded
    ? 'fixed inset-4 z-50 bg-background rounded-lg shadow-2xl'
    : 'relative h-[400px] rounded-lg overflow-hidden';

  return (
    <div className={containerClasses}>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* No data overlay */}
      {!isLoading && markerData.length === 0 && mapReady && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-background/90 px-4 py-3 rounded-lg text-muted-foreground text-sm">
            No location-based changes to display
          </div>
        </div>
      )}

      {/* Expand/Collapse button */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute top-3 right-3 z-10 shadow"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </Button>

      {/* Legend */}
      {uniqueAuthors.length > 0 && (
        <Card className="absolute bottom-3 left-3 z-10 max-w-[200px]">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5">
              <User className="w-3 h-3" />
              Contributors
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <ScrollArea className="max-h-[120px]">
              <div className="space-y-1">
                {uniqueAuthors.map((author, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: author.color }}
                    />
                    <span className="truncate">{author.name}</span>
                    <span className="text-muted-foreground ml-auto">({author.count})</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Operation legend */}
      <div className="absolute bottom-3 right-3 z-10 bg-background/90 rounded-lg px-3 py-2 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" fill="#666" />
          </svg>
          <span>Create</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="2" fill="#666" />
          </svg>
          <span>Update</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24">
            <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="#666" />
          </svg>
          <span>Delete</span>
        </div>
      </div>

      {/* Close button for expanded mode */}
      {isExpanded && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-3 left-3 z-10 shadow"
          onClick={() => setIsExpanded(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
