import { Stop } from '@/types/gtfs';
import maplibregl from 'maplibre-gl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MAP_STYLE } from '../constants';
import { EditableShapePoint, PendingStopChange, RouteDetails, ShapeEditMode, ShapeEditState, StopEditMode } from '../types';

interface UseRouteMapParams {
  details: RouteDetails | null;
  selectedShapeId: string | null;
  setSelectedShapeId: (shapeId: string) => void;
  isEditingShape: boolean;
  shapeEditMode: ShapeEditMode;
  currentPointIndex: number | null;
  setCurrentPointIndex: (index: number | null) => void;
  customShapePoints: ShapeEditState;
  getCurrentShapePoints: (shapeId: string) => EditableShapePoint[];
  handleUpdateShapePoint: (shapeId: string, index: number, lat: number, lon: number) => void;
  handleAddShapePoint: (shapeId: string, index: number, lat: number, lon: number) => void;
  handleDeleteShapePoint: (shapeId: string, index: number) => void;
  allStops: Stop[];
  stopEditModeRef: React.MutableRefObject<StopEditMode>;
  selectedShapeIdRef: React.MutableRefObject<string | null>;
  pendingStopChangesRef: React.MutableRefObject<{ [shapeId: string]: PendingStopChange[] }>;
  getCurrentStopIdsRef: React.MutableRefObject<(shapeId: string) => string[]>;
  handleAddStopToRouteRef: React.MutableRefObject<(stop: Stop) => void>;
  handleRemoveStopClickRef: React.MutableRefObject<(stop: Stop) => void>;
  stopEditMode: StopEditMode;
  pendingStopChanges: { [shapeId: string]: PendingStopChange[] };
  stopSequence: string[];
  fetchAllStopsInBounds: (
    bounds: { north: number; south: number; east: number; west: number },
    zoom: number
  ) => Promise<void>;
}

export function useRouteMap({
  details,
  selectedShapeId,
  setSelectedShapeId,
  isEditingShape,
  shapeEditMode,
  currentPointIndex,
  setCurrentPointIndex,
  customShapePoints,
  getCurrentShapePoints,
  handleUpdateShapePoint,
  handleAddShapePoint,
  handleDeleteShapePoint,
  allStops,
  stopEditModeRef,
  selectedShapeIdRef,
  pendingStopChangesRef,
  getCurrentStopIdsRef,
  handleAddStopToRouteRef,
  handleRemoveStopClickRef,
  stopEditMode,
  pendingStopChanges,
  stopSequence,
  fetchAllStopsInBounds,
}: UseRouteMapParams) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const shapeMarkersRef = useRef<maplibregl.Marker[]>([]);
  const stopMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const currentShapePointsRef = useRef<EditableShapePoint[]>([]);
  const isDraggingRef = useRef(false);
  const mapClickHandlerRef = useRef<((e: maplibregl.MapMouseEvent) => void) | null>(null);
  const shapeEditModeRef = useRef<ShapeEditMode>(shapeEditMode);
  const markerDragHandlersRef = useRef<Map<maplibregl.Marker, { dragstart: () => void; dragend: () => void }>>(new Map());

  // Fetch stops when map moves
  const fetchStopsInBounds = useCallback(() => {
    if (!map.current) return;

    const bounds = map.current.getBounds();
    const zoom = map.current.getZoom();

    fetchAllStopsInBounds(
      {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      },
      zoom
    );
  }, [fetchAllStopsInBounds]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !details) return;

    const bounds = new maplibregl.LngLatBounds();
    details.shapes.forEach((point) => {
      bounds.extend([
        parseFloat(String(point.shape_pt_lon)),
        parseFloat(String(point.shape_pt_lat)),
      ]);
    });

    if (bounds.isEmpty()) {
      details.stops.forEach((stop) => {
        bounds.extend([parseFloat(String(stop.stop_lon)), parseFloat(String(stop.stop_lat))]);
      });
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      bounds: bounds.isEmpty() ? undefined : bounds,
      fitBoundsOptions: { padding: 50 },
    });

    map.current.dragRotate.disable();
    map.current.touchZoomRotate.disableRotation();

    map.current.on('load', () => {
      setMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
      setMapReady(false);
    };
  }, [details]);

  // Fetch stops when map becomes ready and set up move listener
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Initial fetch
    fetchStopsInBounds();

    const handleMoveEnd = () => {
      fetchStopsInBounds();
    };

    map.current.on('moveend', handleMoveEnd);

    return () => {
      map.current?.off('moveend', handleMoveEnd);
    };
  }, [mapReady, fetchStopsInBounds]);

  // Clear shape edit markers
  const clearShapeMarkers = useCallback(() => {
    shapeMarkersRef.current.forEach((marker) => marker.remove());
    shapeMarkersRef.current = [];
    markerDragHandlersRef.current.clear();
  }, []);

  // Update refs when values change
  useEffect(() => {
    shapeEditModeRef.current = shapeEditMode;
  }, [shapeEditMode]);

  useEffect(() => {
    selectedShapeIdRef.current = selectedShapeId;
  }, [selectedShapeId, selectedShapeIdRef]);

  // Update shape edit markers when in edit mode
  const updateShapeEditMarkers = useCallback(() => {
    if (!map.current || !selectedShapeId) return;

    // Don't recreate markers while dragging to avoid index confusion
    if (isDraggingRef.current) return;

    const points = getCurrentShapePoints(selectedShapeId);
    currentShapePointsRef.current = points;

    // If we have the same number of markers, update their positions and appearance
    if (shapeMarkersRef.current.length === points.length && isEditingShape) {
      points.forEach((point, index) => {
        const marker = shapeMarkersRef.current[index];
        if (marker) {
          marker.setLngLat([point.lon, point.lat]);
          // Update the data attribute
          const el = marker.getElement();
          el.setAttribute('data-point-index', String(index));
          
          // Update appearance based on mode and current point
          const isCurrentPoint = index === currentPointIndex;
          const size = isCurrentPoint ? '18px' : '14px';
          el.style.width = size;
          el.style.height = size;
          el.style.border = isCurrentPoint ? '3px solid #fbbf24' : '2px solid white';
          el.style.cursor = shapeEditMode === 'move' ? 'grab' : shapeEditMode === 'delete' ? 'pointer' : 'default';
          
          // Update draggable state
          marker.setDraggable(shapeEditMode === 'move');
          
          // Remove existing drag handlers before adding new ones
          const existingHandlers = markerDragHandlersRef.current.get(marker);
          if (existingHandlers) {
            marker.off('dragstart', existingHandlers.dragstart);
            marker.off('dragend', existingHandlers.dragend);
            markerDragHandlersRef.current.delete(marker);
          }
          
          // Re-attach drag handlers if in move mode
          if (shapeEditMode === 'move') {
            const dragstartHandler = () => {
              isDraggingRef.current = true;
              // Set the dragged point as current when dragging starts
              const pointIndex = parseInt(el.getAttribute('data-point-index') || '0', 10);
              setCurrentPointIndex(pointIndex);
            };

            const dragendHandler = () => {
              const lngLat = marker.getLngLat();
              console.log('lngLat', lngLat);
              // Always get the current index from the data attribute (which is updated when markers are recreated)
              const pointIndex = parseInt(el.getAttribute('data-point-index') || '0', 10);
              // Get the most current points to verify the index is still valid
              const currentShapeId = selectedShapeIdRef.current;
              if (!currentShapeId) return;
              const currentPoints = getCurrentShapePoints(currentShapeId);
              // Verify the index is valid and update
              if (pointIndex >= 0 && pointIndex < currentPoints.length) {
                handleUpdateShapePoint(currentShapeId, pointIndex, lngLat.lat, lngLat.lng);
                // Ensure current point index is set to the moved point
                setCurrentPointIndex(pointIndex);
              }
              // Reset drag flag after state update
              setTimeout(() => {
                isDraggingRef.current = false;
              }, 100);
            };

            marker.on('dragstart', dragstartHandler);
            marker.on('dragend', dragendHandler);
            markerDragHandlersRef.current.set(marker, { dragstart: dragstartHandler, dragend: dragendHandler });
          }
          
          return;
        }
      });
      return;
    }

    // Clear existing markers
    clearShapeMarkers();

    if (!isEditingShape) return;

    const routeColor = details?.route.route_color ? `#${details.route.route_color}` : '#3b82f6';

    points.forEach((point, index) => {
      const el = document.createElement('div');
      el.className = 'shape-edit-marker';
      const isCurrentPoint = index === currentPointIndex;
      const size = isCurrentPoint ? '18px' : '14px';
      el.style.width = size;
      el.style.height = size;
      el.style.borderRadius = '50%';
      el.style.backgroundColor = routeColor;
      el.style.border = isCurrentPoint ? '3px solid #fbbf24' : '2px solid white';
      el.style.cursor = shapeEditMode === 'move' ? 'grab' : shapeEditMode === 'delete' ? 'pointer' : 'default';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      // Store index as data attribute for reliable lookup
      el.setAttribute('data-point-index', String(index));

      const marker = new maplibregl.Marker({
        element: el,
        draggable: shapeEditMode === 'move',
      })
        .setLngLat([point.lon, point.lat])
        .addTo(map.current!);

      // Handle drag start (only in move mode)
      if (shapeEditMode === 'move') {
        const dragstartHandler = () => {
          isDraggingRef.current = true;
          // Set the dragged point as current when dragging starts
          const pointIndex = parseInt(el.getAttribute('data-point-index') || '0', 10);
          setCurrentPointIndex(pointIndex);
        };

        const dragendHandler = () => {
          const lngLat = marker.getLngLat();
          console.log('lngLat', lngLat);
          // Always get the current index from the data attribute (which is updated when markers are recreated)
          const pointIndex = parseInt(el.getAttribute('data-point-index') || '0', 10);
          // Get the most current points to verify the index is still valid
          const currentShapeId = selectedShapeIdRef.current;
          if (!currentShapeId) return;
          const currentPoints = getCurrentShapePoints(currentShapeId);
          // Verify the index is valid and update
          if (pointIndex >= 0 && pointIndex < currentPoints.length) {
            handleUpdateShapePoint(currentShapeId, pointIndex, lngLat.lat, lngLat.lng);
            // Ensure current point index is set to the moved point
            setCurrentPointIndex(pointIndex);
          }
          // Reset drag flag after state update
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 100);
        };

        marker.on('dragstart', dragstartHandler);
        marker.on('dragend', dragendHandler);
        markerDragHandlersRef.current.set(marker, { dragstart: dragstartHandler, dragend: dragendHandler });
      }

      // Handle click on marker - use ref to get current mode value
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const pointIndex = parseInt(el.getAttribute('data-point-index') || '0', 10);
        const currentMode = shapeEditModeRef.current;
        const currentShapeId = selectedShapeIdRef.current;
        
        if (!currentShapeId) return;
        
        if (currentMode === 'delete') {
          handleDeleteShapePoint(currentShapeId, pointIndex);
        } else if (currentMode === 'move') {
          // Set as current point when clicking in move mode
          setCurrentPointIndex(pointIndex);
        } else if (currentMode === 'add') {
          // Set as current point when clicking in add mode
          setCurrentPointIndex(pointIndex);
        }
      });

      // Prevent right-click context menu
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });

      shapeMarkersRef.current.push(marker);
    });
  }, [
    selectedShapeId,
    isEditingShape,
    shapeEditMode,
    currentPointIndex,
    setCurrentPointIndex,
    getCurrentShapePoints,
    details,
    clearShapeMarkers,
    handleUpdateShapePoint,
    handleDeleteShapePoint,
  ]);

  // Clear stop markers
  const clearStopMarkers = useCallback(() => {
    stopMarkersRef.current.forEach((marker) => marker.remove());
    stopMarkersRef.current.clear();
  }, []);

  // Update stop markers when stops or selection changes
  const updateStopMarkers = useCallback(() => {
    if (!map.current || !mapReady) return;

    const routeColor = details?.route.route_color ? `#${details.route.route_color}` : '#3b82f6';
    const shapeId = selectedShapeIdRef.current;
    const currentStopIds = shapeId
      ? new Set(getCurrentStopIdsRef.current(shapeId))
      : new Set<string>();
    const pendingChanges = shapeId ? pendingStopChangesRef.current[shapeId] || [] : [];
    const pendingAddIds = new Set(
      pendingChanges.filter((c) => c.type === 'add').map((c) => c.stopId)
    );
    const pendingRemoveIds = new Set(
      pendingChanges.filter((c) => c.type === 'remove').map((c) => c.stopId)
    );

    // Build a map of stop_id to sequence number (1-based)
    const stopSequenceMap = new Map<string, number>();
    stopSequence.forEach((stopId, index) => {
      stopSequenceMap.set(stopId, index + 1);
    });

    // Remove markers that are no longer in allStops
    const currentStopIdsInView = new Set(allStops.map((s) => s.stop_id));
    stopMarkersRef.current.forEach((marker, stopId) => {
      if (!currentStopIdsInView.has(stopId)) {
        marker.remove();
        stopMarkersRef.current.delete(stopId);
      }
    });

    // Add or update markers for all stops
    allStops.forEach((stop) => {
      const stopLat = parseFloat(String(stop.stop_lat));
      const stopLon = parseFloat(String(stop.stop_lon));
      const isRouteStop = currentStopIds.has(stop.stop_id);
      const isPendingAdd = pendingAddIds.has(stop.stop_id);
      const isPendingRemove = pendingRemoveIds.has(stop.stop_id);
      const sequenceNum = stopSequenceMap.get(stop.stop_id);
      const isFirst = sequenceNum === 1;
      const isLast = sequenceNum === stopSequence.length;

      // Determine marker color
      let circleColor = '#9ca3af'; // grey/muted for non-route stops
      let textColor = '#fff';
      let borderColor = '#9ca3af';
      
      if (isPendingAdd) {
        circleColor = '#22c55e'; // green for pending add
        borderColor = '#22c55e';
      } else if (isPendingRemove) {
        circleColor = '#ef4444'; // red for pending remove
        borderColor = '#ef4444';
      } else if (isRouteStop && sequenceNum !== undefined) {
        if (isFirst) {
          circleColor = '#22c55e'; // green for first stop
          borderColor = '#22c55e';
        } else if (isLast) {
          circleColor = '#ef4444'; // red for last stop
          borderColor = '#ef4444';
        } else {
          circleColor = '#fff'; // white background for intermediate stops
          textColor = routeColor;
          borderColor = routeColor;
        }
      }

      const existingMarker = stopMarkersRef.current.get(stop.stop_id);

      // Helper to create/update marker element
      const createMarkerContent = () => {
        const showSequence = (isRouteStop || isPendingAdd) && sequenceNum !== undefined;
        const isIntermediate = isRouteStop && !isFirst && !isLast && !isPendingAdd && !isPendingRemove;
        
        if (showSequence) {
          // Circle marker with sequence number
          return `
            <div style="
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background-color: ${circleColor};
              border: 2px solid ${borderColor};
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 600;
              color: ${isIntermediate ? textColor : '#fff'};
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">${sequenceNum}</div>
          `;
        } else {
          // Small circle for non-route stops
          return `
            <div style="
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background-color: ${circleColor};
              border: 2px solid #fff;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>
          `;
        }
      };

      if (existingMarker) {
        // Update existing marker position and content
        existingMarker.setLngLat([stopLon, stopLat]);
        const el = existingMarker.getElement();
        el.innerHTML = createMarkerContent();
        // Update opacity
        el.style.opacity = isRouteStop || isPendingAdd ? '1' : '0.5';
      } else {
        // Create new marker
        const el = document.createElement('div');
        el.innerHTML = createMarkerContent();
        el.style.cursor = 'pointer';
        el.style.opacity = isRouteStop || isPendingAdd ? '1' : '0.5';

        el.addEventListener('click', (e) => {
          e.stopPropagation();

          // Use refs to get current values (avoid stale closures)
          const currentEditMode = stopEditModeRef.current;
          const currentShapeId = selectedShapeIdRef.current;
          const currentStopIdsNow = currentShapeId
            ? new Set(getCurrentStopIdsRef.current(currentShapeId))
            : new Set<string>();
          const pendingNow = currentShapeId
            ? pendingStopChangesRef.current[currentShapeId] || []
            : [];
          const isPendingAddNow = pendingNow.some(
            (c) => c.type === 'add' && c.stopId === stop.stop_id
          );
          const isPendingRemoveNow = pendingNow.some(
            (c) => c.type === 'remove' && c.stopId === stop.stop_id
          );
          const isRouteStopNow = currentStopIdsNow.has(stop.stop_id);

          // If in add mode and stop is not already in route, add it
          if (currentEditMode === 'add' && !isRouteStopNow && !isPendingAddNow) {
            handleAddStopToRouteRef.current(stop);
          } else if (isRouteStopNow && !isPendingRemoveNow && currentEditMode !== 'none') {
            // If clicking a route stop while in edit mode, offer to remove
            handleRemoveStopClickRef.current(stop);
          }
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([stopLon, stopLat])
          .addTo(map.current!);

        stopMarkersRef.current.set(stop.stop_id, marker);
      }
    });
  }, [
    allStops,
    details,
    mapReady,
    stopSequence,
    stopEditModeRef,
    selectedShapeIdRef,
    pendingStopChangesRef,
    getCurrentStopIdsRef,
    handleAddStopToRouteRef,
    handleRemoveStopClickRef,
  ]);

  // Update map layers when shape selection changes
  const updateMapLayers = useCallback(() => {
    if (!map.current || !mapReady || !details) return;

    // Ensure the map style is fully loaded before modifying layers
    if (!map.current.isStyleLoaded()) return;

    // Remove existing layers and sources
    ['route-line', 'route-line-selected'].forEach((layerId) => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
    });
    ['route-shapes'].forEach((sourceId) => {
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }
    });

    // Group shape points by shape_id, using custom points if available
    const shapesByIdMap: { [shapeId: string]: { lon: number; lat: number; sequence: number }[] } =
      {};

    // Get unique shape IDs from original shapes
    const shapeIds = [...new Set(details.shapes.map((s) => s.shape_id))];

    shapeIds.forEach((shapeId) => {
      if (customShapePoints[shapeId]) {
        // Use custom shape points if available
        shapesByIdMap[shapeId] = customShapePoints[shapeId].map((p) => ({
          lon: p.lon,
          lat: p.lat,
          sequence: p.sequence,
        }));
      } else {
        // Use original shape points
        shapesByIdMap[shapeId] = details.shapes
          .filter((s) => s.shape_id === shapeId)
          .map((s) => ({
            lon: parseFloat(String(s.shape_pt_lon)),
            lat: parseFloat(String(s.shape_pt_lat)),
            sequence: s.shape_pt_sequence,
          }));
      }
    });

    // Create line features for each shape
    const lineFeatures = Object.entries(shapesByIdMap).map(([shapeId, points]) => {
      const sortedPoints = points.sort((a, b) => a.sequence - b.sequence);
      return {
        type: 'Feature' as const,
        properties: {
          shapeId,
          isSelected: shapeId === selectedShapeId,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: sortedPoints.map((p) => [p.lon, p.lat]),
        },
      };
    });

    // Add shapes source
    map.current.addSource('route-shapes', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: lineFeatures },
    });

    // Add unselected route lines
    map.current.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route-shapes',
      filter: ['!=', ['get', 'isSelected'], true],
      paint: {
        'line-color': '#94a3b8',
        'line-width': 4,
        'line-opacity': 0.5,
      },
    });

    // Add selected route line
    map.current.addLayer({
      id: 'route-line-selected',
      type: 'line',
      source: 'route-shapes',
      filter: ['==', ['get', 'isSelected'], true],
      paint: {
        'line-color': details.route.route_color ? `#${details.route.route_color}` : '#3b82f6',
        'line-width': 5,
      },
    });

    // Remove old map click handler if it exists
    if (mapClickHandlerRef.current) {
      map.current.off('click', mapClickHandlerRef.current);
      mapClickHandlerRef.current = null;
    }

    // Click handler for route lines to switch direction (only when not editing)
    map.current.on('click', 'route-line', (e) => {
      if (isEditingShape) return;
      const feature = e.features?.[0];
      if (feature?.properties?.shapeId) {
        setSelectedShapeId(feature.properties.shapeId);
      }
    });


    // Click handler for map to add points in add mode anywhere on the map
    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (!isEditingShape || !selectedShapeId || shapeEditMode !== 'add') return;
      if (currentPointIndex === null) return;

      // Check if we clicked on a marker - don't add if clicking on a marker
      if (e.originalEvent && (e.originalEvent.target as HTMLElement).closest('.maplibregl-marker')) {
        return;
      }

      const clickedLngLat = e.lngLat;
      // Add point after the current point
      handleAddShapePoint(selectedShapeId, currentPointIndex, clickedLngLat.lat, clickedLngLat.lng);
    };

    map.current.on('click', handleMapClick);
    mapClickHandlerRef.current = handleMapClick;

    // Change cursor on hover
    map.current.on('mouseenter', 'route-line', () => {
      if (map.current && !isEditingShape) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'route-line', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
    map.current.on('mouseenter', 'route-line-selected', () => {
      if (map.current && isEditingShape && shapeEditMode === 'add') {
        map.current.getCanvas().style.cursor = 'crosshair';
      }
    });
    map.current.on('mouseleave', 'route-line-selected', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
  }, [
    details,
    mapReady,
    selectedShapeId,
    customShapePoints,
    isEditingShape,
    shapeEditMode,
    currentPointIndex,
    getCurrentShapePoints,
    handleAddShapePoint,
    setSelectedShapeId,
  ]);

  // Update map layers when dependencies change
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // If style is loaded, update immediately
    if (map.current.isStyleLoaded()) {
      updateMapLayers();
    } else {
      // Otherwise wait for style to load
      const onStyleLoad = () => updateMapLayers();
      map.current.once('style.load', onStyleLoad);
      return () => {
        map.current?.off('style.load', onStyleLoad);
      };
    }
  }, [updateMapLayers, mapReady]);

  // Update shape edit markers when editing mode or points change
  useEffect(() => {
    updateShapeEditMarkers();
  }, [updateShapeEditMarkers]);

  // Update stop markers when dependencies change
  useEffect(() => {
    updateStopMarkers();
  }, [updateStopMarkers, selectedShapeId, pendingStopChanges, stopEditMode, stopSequence]);

  // Clean up markers when component unmounts
  useEffect(() => {
    return () => {
      clearShapeMarkers();
      clearStopMarkers();
    };
  }, [clearShapeMarkers, clearStopMarkers]);

  return {
    mapContainer,
    map,
  };
}
