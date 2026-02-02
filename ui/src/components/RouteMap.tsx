import { currentInstance } from '@/utils/constants';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useRef } from 'react';
import { Shape, Stop, StopTime } from '../types/gtfs';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

interface RouteMapProps {
  shapes: Shape[];
  stops: Stop[];
  stopTimes: StopTime[];
  selectedShapeId?: string;
  allShapeIds?: string[];
  onShapeSelect?: (shapeId: string) => void;
  routeColor?: string | null;
}

export default function RouteMap({
  shapes,
  stops,
  stopTimes,
  selectedShapeId,
  allShapeIds = [],
  onShapeSelect,
  routeColor,
}: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const setupCompleteRef = useRef(false);

  // Handle shape click
  const handleShapeClick = useCallback(
    (shapeId: string) => {
      if (onShapeSelect && shapeId !== selectedShapeId) {
        onShapeSelect(shapeId);
      }
    },
    [onShapeSelect, selectedShapeId]
  );

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: currentInstance.mapCenter as [number, number],
      zoom: 11,
      minZoom: 9,
      maxZoom: 18,
    });

    map.current.dragRotate.disable();
    map.current.touchZoomRotate.disableRotation();

    return () => {
      map.current?.remove();
      map.current = null;
      setupCompleteRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !shapes.length) return;

    const setupMap = () => {
      if (!map.current) return;

      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Group all shapes by shape_id and sort by sequence
      const shapeGroups: { [key: string]: Shape[] } = {};
      shapes.forEach(shape => {
        if (!shapeGroups[shape.shape_id]) {
          shapeGroups[shape.shape_id] = [];
        }
        shapeGroups[shape.shape_id].push(shape);
      });

      // Sort each group by sequence
      Object.keys(shapeGroups).forEach(key => {
        shapeGroups[key].sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence);
      });

      // Determine which shapes to show
      const shapesToShow = allShapeIds.length > 0 ? allShapeIds : Object.keys(shapeGroups);
      const activeShapeId = selectedShapeId || shapesToShow[0];

      // Remove existing layers and sources
      shapesToShow.forEach(shapeId => {
        const layerId = `route-line-${shapeId}`;
        const sourceId = `route-${shapeId}`;
        if (map.current?.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        if (map.current?.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
      });

      // Also clean up any old layers that might exist
      const style = map.current.getStyle();
      if (style?.layers) {
        style.layers.forEach(layer => {
          if (layer.id.startsWith('route-line-')) {
            map.current?.removeLayer(layer.id);
          }
        });
      }
      if (style?.sources) {
        Object.keys(style.sources).forEach(sourceId => {
          if (sourceId.startsWith('route-')) {
            map.current?.removeSource(sourceId);
          }
        });
      }

      const allCoordinates: [number, number][] = [];

      // Add all shape lines - unselected ones first (so selected is on top)
      const sortedShapeIds = [...shapesToShow].sort((a, b) => {
        if (a === activeShapeId) return 1;
        if (b === activeShapeId) return -1;
        return 0;
      });

      sortedShapeIds.forEach(shapeId => {
        const routeShapes = shapeGroups[shapeId] || [];
        if (routeShapes.length === 0) return;

        const coordinates: [number, number][] = routeShapes.map(s => [
          parseFloat(String(s.shape_pt_lon)),
          parseFloat(String(s.shape_pt_lat)),
        ]);

        allCoordinates.push(...coordinates);

        const isSelected = shapeId === activeShapeId;
        const sourceId = `route-${shapeId}`;
        const layerId = `route-line-${shapeId}`;

        // Add route line source
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { shapeId },
            geometry: {
              type: 'LineString',
              coordinates,
            },
          },
        });

        // Add route line layer
        const selectedColor = routeColor ? `#${routeColor}` : '#3b82f6';
        map.current!.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': isSelected ? selectedColor : '#94a3b8',
            'line-width': isSelected ? 5 : 3,
            'line-opacity': isSelected ? 1 : 0.6,
          },
        });

        // Add click handler for unselected shapes
        if (!isSelected && onShapeSelect) {
          map.current!.on('click', layerId, () => {
            handleShapeClick(shapeId);
          });

          // Change cursor on hover
          map.current!.on('mouseenter', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
          });
          map.current!.on('mouseleave', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
          });
        }
      });

      // Get ordered stops from stopTimes (for the selected shape)
      const orderedStopIds = [...new Set(stopTimes.map(st => st.stop_id))];
      const orderedStops = orderedStopIds
        .map(id => stops.find(s => s.stop_id === id))
        .filter(Boolean) as Stop[];

      // Add stop markers
      const stopColor = routeColor ? `#${routeColor}` : '#3b82f6';
      orderedStops.forEach((stop, index) => {
        const isFirst = index === 0;
        const isLast = index === orderedStops.length - 1;

        // Create marker element
        const el = document.createElement('div');
        el.className = 'route-stop-marker';
        el.style.width = isFirst || isLast ? '20px' : '14px';
        el.style.height = isFirst || isLast ? '20px' : '14px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';

        if (isFirst) {
          el.style.backgroundColor = '#22c55e'; // green
        } else if (isLast) {
          el.style.backgroundColor = '#ef4444'; // red
        } else {
          el.style.backgroundColor = stopColor; // route color
        }

        // Create popup
        const popup = new maplibregl.Popup({
          offset: 25,
          closeButton: false,
        }).setHTML(`
          <div style="font-size: 12px; font-weight: 500; padding: 4px;">
            ${index + 1}. ${stop.stop_name}
          </div>
        `);

        // Add marker
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([parseFloat(String(stop.stop_lon)), parseFloat(String(stop.stop_lat))])
          .setPopup(popup)
          .addTo(map.current!);

        markersRef.current.push(marker);
      });

      // Fit bounds to show all shapes (only on first load)
      if (!setupCompleteRef.current && allCoordinates.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        allCoordinates.forEach(coord => bounds.extend(coord));
        orderedStops.forEach(stop => {
          bounds.extend([parseFloat(String(stop.stop_lon)), parseFloat(String(stop.stop_lat))]);
        });

        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15,
        });
        setupCompleteRef.current = true;
      }
    };

    if (map.current.loaded()) {
      setupMap();
    } else {
      map.current.on('load', setupMap);
    }
  }, [shapes, stops, stopTimes, selectedShapeId, allShapeIds, handleShapeClick, onShapeSelect]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
