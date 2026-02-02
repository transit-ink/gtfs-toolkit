import { GroupItemType } from '@/services/groups';
import { Shape, Stop } from '@/types/gtfs';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_STYLE } from './constants';
import { GroupItemWithData, RouteWithShapes } from './types';

interface GroupMapProps {
  items: GroupItemWithData[];
}

export function GroupMap({ items }: GroupMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const mapReadyRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.current.dragRotate.disable();
    map.current.touchZoomRotate.disableRotation();

    map.current.on('load', () => {
      mapReadyRef.current = true;
      // Trigger a re-render to draw items
      updateMap();
    });

    return () => {
      map.current?.remove();
      map.current = null;
      mapReadyRef.current = false;
    };
  }, []);

  // Update map when items change
  const updateMap = () => {
    if (!map.current || !mapReadyRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Clear existing route layers and sources
    items.forEach((_, index) => {
      const layerId = `route-line-${index}`;
      const sourceId = `route-source-${index}`;
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }
    });

    // Also clean up any orphaned layers from previous renders
    const style = map.current.getStyle();
    if (style?.layers) {
      style.layers.forEach((layer) => {
        if (layer.id.startsWith('route-line-')) {
          map.current!.removeLayer(layer.id);
        }
      });
    }
    if (style?.sources) {
      Object.keys(style.sources).forEach((sourceId) => {
        if (sourceId.startsWith('route-source-')) {
          map.current!.removeSource(sourceId);
        }
      });
    }

    // Collect all coordinates for bounds
    const bounds = new maplibregl.LngLatBounds();
    let hasCoordinates = false;

    // Process items
    items.forEach((item, index) => {
      if (item.loading || item.error || !item.data) return;

      if (item.type === GroupItemType.STOP) {
        const stop = item.data as Stop;
        const lat = parseFloat(String(stop.stop_lat));
        const lon = parseFloat(String(stop.stop_lon));

        if (!isNaN(lat) && !isNaN(lon)) {
          bounds.extend([lon, lat]);
          hasCoordinates = true;

          // Create marker element
          const el = document.createElement('div');
          el.innerHTML = `
            <svg width="32" height="44" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="#3b82f6"/>
              <circle cx="12" cy="12" r="5" fill="white"/>
              <text x="12" y="15" text-anchor="middle" fill="#3b82f6" font-size="8" font-weight="bold">${index + 1}</text>
            </svg>
          `;
          el.style.cursor = 'pointer';

          const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([lon, lat])
            .setPopup(
              new maplibregl.Popup({ offset: 25 }).setHTML(`
                <div style="padding: 4px;">
                  <strong>${stop.stop_name}</strong>
                  <br/>
                  <span style="font-size: 12px; color: #666;">${stop.stop_id}</span>
                </div>
              `)
            )
            .addTo(map.current!);

          markersRef.current.push(marker);
        }
      } else if (item.type === GroupItemType.ROUTE) {
        const route = item.data as RouteWithShapes;
        const shapes = route.shapes || [];

        if (shapes.length > 0) {
          // Group shape points by shape_id
          const shapesByIdMap: { [shapeId: string]: Shape[] } = {};
          shapes.forEach((point) => {
            if (!shapesByIdMap[point.shape_id]) {
              shapesByIdMap[point.shape_id] = [];
            }
            shapesByIdMap[point.shape_id].push(point);
          });

          // Create line features for each shape
          const lineFeatures = Object.entries(shapesByIdMap).map(([shapeId, points]) => {
            const sortedPoints = points.sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence);
            
            // Add points to bounds
            sortedPoints.forEach((p) => {
              const lon = parseFloat(String(p.shape_pt_lon));
              const lat = parseFloat(String(p.shape_pt_lat));
              if (!isNaN(lon) && !isNaN(lat)) {
                bounds.extend([lon, lat]);
                hasCoordinates = true;
              }
            });

            return {
              type: 'Feature' as const,
              properties: { shapeId },
              geometry: {
                type: 'LineString' as const,
                coordinates: sortedPoints.map((p) => [
                  parseFloat(String(p.shape_pt_lon)),
                  parseFloat(String(p.shape_pt_lat)),
                ]),
              },
            };
          });

          // Add source and layer for this route
          const sourceId = `route-source-${index}`;
          const layerId = `route-line-${index}`;

          map.current!.addSource(sourceId, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: lineFeatures },
          });

          map.current!.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': route.route_color ? `#${route.route_color}` : '#3b82f6',
              'line-width': 4,
              'line-opacity': 0.8,
            },
          });
        }
      }
    });

    // Fit bounds if we have coordinates
    if (hasCoordinates && !bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  };

  // Effect to update map when items change
  useEffect(() => {
    updateMap();
  }, [items]);

  return (
    <div ref={mapContainer} className="w-full h-full min-h-[300px] rounded-lg overflow-hidden" />
  );
}
