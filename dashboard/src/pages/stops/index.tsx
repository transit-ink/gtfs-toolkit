import {
  createStop,
  deleteStop,
  getStop,
  getStopGroup,
  getStopsInBounds,
  getTripsForStop,
  updateStop,
} from '@/services/stops';
import { Stop, Trip } from '@/types/gtfs';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEFAULT_LAT,
  DEFAULT_LON,
  DEFAULT_ZOOM,
  MAP_STYLE,
  MAX_ZOOM,
  MIN_ZOOM,
  MIN_ZOOM_FOR_STOPS,
} from './constants';
import { DeleteStopDialog } from './deleteStopDialog';
import { StopsMap } from './stopsMap';
import { StopsSidebar } from './stopsSidebar';
import { EditMode } from './types';
import { getSavedMapState, handleApiError, saveMapState } from './utils';
import { StopSearchInput } from '@/components/StopSearchInput';

export default function StopsPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const stopMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const arrowLayerRef = useRef<boolean>(false);

  // Refs to track current state for marker click handlers (to avoid stale closures)
  const editModeRef = useRef<EditMode>('none');
  const selectedStopRef = useRef<Stop | null>(null);
  const handleSetParentRef = useRef<(parentId: string) => void>(() => {});

  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [isLoadingStops, setIsLoadingStops] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Edit states
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripsForStop, setTripsForStop] = useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [parentStop, setParentStop] = useState<Stop | null>(null);
  const [isLoadingParent, setIsLoadingParent] = useState(false);
  const [externalParentStops, setExternalParentStops] = useState<Map<string, Stop>>(new Map());
  const [externalChildStops, setExternalChildStops] = useState<Map<string, Stop[]>>(new Map());
  const [childStopsForSelected, setChildStopsForSelected] = useState<Stop[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [searchedStop, setSearchedStop] = useState<{ stop_id: string; stop_name: string } | null>(
    null
  );

  // Keep refs in sync with state
  useEffect(() => {
    editModeRef.current = editMode;
  }, [editMode]);

  useEffect(() => {
    selectedStopRef.current = selectedStop;
  }, [selectedStop]);

  // Fetch stops when map bounds change
  const fetchStopsInBounds = useCallback(async () => {
    if (!map.current) return;

    const bounds = map.current.getBounds();
    const zoom = map.current.getZoom();

    if (zoom < MIN_ZOOM_FOR_STOPS) {
      setStops([]);
      return;
    }

    setIsLoadingStops(true);
    try {
      const data = await getStopsInBounds({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLon: bounds.getWest(),
        maxLon: bounds.getEast(),
        limit: 200,
      });
      setStops(data);
    } catch (error) {
      console.error('Error fetching stops:', error);
    } finally {
      setIsLoadingStops(false);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Load saved map state or use defaults
    const savedState = getSavedMapState();
    const initialLat = savedState?.lat ?? DEFAULT_LAT;
    const initialLon = savedState?.lon ?? DEFAULT_LON;
    const initialZoom = savedState?.zoom ?? DEFAULT_ZOOM;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [initialLon, initialLat],
      zoom: initialZoom,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });

    map.current.dragRotate.disable();
    map.current.touchZoomRotate.disableRotation();

    map.current.on('load', () => {
      setMapReady(true);
      fetchStopsInBounds();

      // Add arrow source and layer for parent-child relationships
      map.current!.addSource('arrows', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current!.addLayer({
        id: 'arrow-lines',
        type: 'line',
        source: 'arrows',
        paint: {
          'line-color': '#6366f1',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });

      arrowLayerRef.current = true;
    });

    // Save map state on moveend (includes both pan and zoom)
    map.current.on('moveend', () => {
      fetchStopsInBounds();

      // Persist map center and zoom
      if (map.current) {
        const center = map.current.getCenter();
        const zoom = map.current.getZoom();
        saveMapState(center.lat, center.lng, zoom);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [fetchStopsInBounds]);

  // Handle map clicks
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const handleMapClick = async (e: maplibregl.MapMouseEvent) => {
      if (editMode === 'add') {
        // Create a new stop at click location
        const { lng, lat } = e.lngLat;

        // Get agency_id from an existing stop in the area
        const existingStop = stops.find(s => s.agency_id);
        if (!existingStop?.agency_id) {
          setError(
            'Cannot add stop: No existing stops found to determine agency. Please zoom in to an area with existing stops.'
          );
          setEditMode('none');
          return;
        }

        setIsSaving(true);
        setError(null);
        try {
          const newStop = await createStop({
            stop_id: `stop_${Date.now()}`,
            stop_name: 'Unnamed',
            stop_lat: lat,
            stop_lon: lng,
            agency_id: existingStop.agency_id,
          });
          setStops(prev => [...prev, newStop]);
          setSelectedStop(newStop);
          setEditName(newStop.stop_name);
          setEditMode('none');
        } catch (err) {
          handleApiError(err, 'create stop', setError);
          setEditMode('none');
        } finally {
          setIsSaving(false);
        }
      } else if (editMode === 'move' && selectedStop) {
        // Move selected stop to click location
        const { lng, lat } = e.lngLat;
        setIsSaving(true);
        setError(null);
        try {
          const updatedStop = await updateStop(selectedStop.stop_id, {
            stop_lat: lat,
            stop_lon: lng,
          });
          setStops(prev => prev.map(s => (s.stop_id === updatedStop.stop_id ? updatedStop : s)));
          setSelectedStop(updatedStop);
          setEditMode('none');
        } catch (err) {
          handleApiError(err, 'move stop', setError);
          setEditMode('none');
        } finally {
          setIsSaving(false);
        }
      }
    };

    map.current.on('click', handleMapClick);
    return () => {
      map.current?.off('click', handleMapClick);
    };
  }, [editMode, selectedStop, mapReady, stops]);

  // Update arrow lines for parent-child relationships
  useEffect(() => {
    if (!map.current || !arrowLayerRef.current) return;

    const features: Array<{
      type: 'Feature';
      properties: Record<string, unknown>;
      geometry: {
        type: 'LineString';
        coordinates: [number, number][];
      };
    }> = [];
    const visibleStopIds = new Set(stops.map(s => s.stop_id));

    // Draw lines from visible child stops to their parents
    stops.forEach(stop => {
      if (stop.parent_station) {
        // First try to find parent in visible stops
        let parent = stops.find(s => s.stop_id === stop.parent_station);

        // If not found, check the external parents map
        if (!parent) {
          parent = externalParentStops.get(stop.parent_station);
        }

        if (parent) {
          features.push({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [parseFloat(String(stop.stop_lon)), parseFloat(String(stop.stop_lat))],
                [parseFloat(String(parent.stop_lon)), parseFloat(String(parent.stop_lat))],
              ],
            },
          });
        }
      }
    });

    // Draw lines from visible parent stops to their child stops outside the visible area
    stops.forEach(parentStop => {
      const externalChildren = externalChildStops.get(parentStop.stop_id);
      if (externalChildren && externalChildren.length > 0) {
        externalChildren.forEach(child => {
          // Only draw if child is still outside visible area
          if (!visibleStopIds.has(child.stop_id)) {
            features.push({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  [
                    parseFloat(String(parentStop.stop_lon)),
                    parseFloat(String(parentStop.stop_lat)),
                  ],
                  [parseFloat(String(child.stop_lon)), parseFloat(String(child.stop_lat))],
                ],
              },
            });
          }
        });
      }
    });

    const source = map.current.getSource('arrows') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }
  }, [stops, externalParentStops, externalChildStops]);

  // Update stop markers when stops or selection changes
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Remove markers that are no longer in stops
    const currentStopIds = new Set(stops.map(s => s.stop_id));
    stopMarkersRef.current.forEach((marker, stopId) => {
      if (!currentStopIds.has(stopId)) {
        marker.remove();
        stopMarkersRef.current.delete(stopId);
      }
    });

    // Add or update markers
    stops.forEach(stop => {
      const stopLat = parseFloat(String(stop.stop_lat));
      const stopLon = parseFloat(String(stop.stop_lon));
      const isSelected = stop.stop_id === selectedStop?.stop_id;
      // Check if this stop is a parent - either visible children or external children
      const hasVisibleChildren = stops.some(s => s.parent_station === stop.stop_id);
      const hasExternalChildren = (externalChildStops.get(stop.stop_id)?.length ?? 0) > 0;
      const isParent = hasVisibleChildren || hasExternalChildren;
      const hasParent = !!stop.parent_station;

      // Determine marker color
      let pinColor = '#6b7280'; // grey default
      if (isSelected) {
        pinColor = '#ef4444'; // red for selected
      } else if (isParent) {
        pinColor = '#2563eb'; // bright blue for parent stations
      } else if (hasParent) {
        pinColor = '#93c5fd'; // light/greyish blue for child stops
      }

      const existingMarker = stopMarkersRef.current.get(stop.stop_id);

      if (existingMarker) {
        // Update existing marker position and color
        existingMarker.setLngLat([stopLon, stopLat]);
        const el = existingMarker.getElement();
        const svg = el.querySelector('svg path');
        if (svg) {
          svg.setAttribute('fill', pinColor);
        }
      } else {
        // Create new marker
        const el = document.createElement('div');
        el.innerHTML = `
          <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="${pinColor}"/>
            <circle cx="12" cy="12" r="5" fill="white"/>
          </svg>
        `;
        el.style.cursor = 'pointer';

        el.addEventListener('click', e => {
          e.stopPropagation();

          // Use refs to get current values (avoid stale closures)
          const currentEditMode = editModeRef.current;
          const currentSelectedStop = selectedStopRef.current;

          if (
            currentEditMode === 'set-parent' &&
            currentSelectedStop &&
            stop.stop_id !== currentSelectedStop.stop_id
          ) {
            // Set this stop as parent of selected stop
            handleSetParentRef.current(stop.stop_id);
          } else {
            // Select this stop
            setSelectedStop(stop);
            setEditName(stop.stop_name);
            setEditMode('none');
          }
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([stopLon, stopLat])
          .addTo(map.current!);

        stopMarkersRef.current.set(stop.stop_id, marker);
      }
    });
  }, [stops, selectedStop, editMode, mapReady, externalChildStops]);

  // Handle setting parent station
  const handleSetParent = async (parentId: string) => {
    if (!selectedStop) return;

    setIsSaving(true);
    setError(null);
    try {
      const updatedStop = await updateStop(selectedStop.stop_id, {
        parent_station: parentId,
      });
      setStops(prev => prev.map(s => (s.stop_id === updatedStop.stop_id ? updatedStop : s)));
      setSelectedStop(updatedStop);
      setEditMode('none');
    } catch (err) {
      handleApiError(err, 'set parent station', setError);
      setEditMode('none');
    } finally {
      setIsSaving(false);
    }
  };

  // Keep handler ref in sync
  useEffect(() => {
    handleSetParentRef.current = handleSetParent;
  });

  // Fetch parent stop for the selected stop (for display in sidebar)
  useEffect(() => {
    const fetchParentStop = async () => {
      if (!selectedStop?.parent_station) {
        setParentStop(null);
        return;
      }

      // First check if parent is already in the visible stops
      const existingParent = stops.find(s => s.stop_id === selectedStop.parent_station);
      if (existingParent) {
        setParentStop(existingParent);
        return;
      }

      // Check if we already fetched this parent for the map lines
      const cachedParent = externalParentStops.get(selectedStop.parent_station);
      if (cachedParent) {
        setParentStop(cachedParent);
        return;
      }

      // Fetch parent stop from API
      setIsLoadingParent(true);
      try {
        const parent = await getStop(selectedStop.parent_station);
        setParentStop(parent);
      } catch (err) {
        console.error('Error fetching parent stop:', err);
        setParentStop(null);
      } finally {
        setIsLoadingParent(false);
      }
    };

    fetchParentStop();
  }, [selectedStop?.stop_id, selectedStop?.parent_station, stops, externalParentStops]);

  // Fetch all parent stops that are outside the visible area (for drawing lines)
  useEffect(() => {
    const fetchExternalParents = async () => {
      // Find all stops that have parents not in the current view
      const visibleStopIds = new Set(stops.map(s => s.stop_id));
      const parentsToFetch = new Set<string>();

      stops.forEach(stop => {
        if (stop.parent_station && !visibleStopIds.has(stop.parent_station)) {
          // Don't refetch if we already have it
          if (!externalParentStops.has(stop.parent_station)) {
            parentsToFetch.add(stop.parent_station);
          }
        }
      });

      if (parentsToFetch.size === 0) return;

      // Fetch all missing parents in parallel
      const fetchPromises = Array.from(parentsToFetch).map(async parentId => {
        try {
          const parent = await getStop(parentId);
          return { id: parentId, stop: parent };
        } catch (err) {
          console.error(`Error fetching parent stop ${parentId}:`, err);
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);

      // Update the map with fetched parents
      setExternalParentStops(prev => {
        const newMap = new Map(prev);
        results.forEach(result => {
          if (result) {
            newMap.set(result.id, result.stop);
          }
        });
        return newMap;
      });
    };

    fetchExternalParents();
  }, [stops, externalParentStops]);

  // Fetch all child stops that are outside the visible area (for drawing lines and marker colors)
  useEffect(() => {
    const fetchExternalChildren = async () => {
      const visibleStopIds = new Set(stops.map(s => s.stop_id));

      // Fetch stop groups for ALL visible stops that we haven't checked yet
      // This ensures we know about children even when they're all outside the view
      const stopsToFetch = stops.filter(stop => !externalChildStops.has(stop.stop_id));

      if (stopsToFetch.length === 0) return;

      const fetchPromises = stopsToFetch.map(async stop => {
        try {
          const group = await getStopGroup(stop.stop_id);
          // Filter to only children (stops that have this stop as parent)
          const children = group.filter(s => s.parent_station === stop.stop_id);
          // Separate into visible and external
          const externalChildren = children.filter(s => !visibleStopIds.has(s.stop_id));
          return {
            parentId: stop.stop_id,
            children: externalChildren,
            hasAnyChildren: children.length > 0,
          };
        } catch (err) {
          console.error(`Error fetching stop group for ${stop.stop_id}:`, err);
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);

      setExternalChildStops(prev => {
        const newMap = new Map(prev);
        results.forEach(result => {
          if (result) {
            // Store children (even empty array) to mark that we've checked this stop
            newMap.set(result.parentId, result.children);
          }
        });
        return newMap;
      });
    };

    fetchExternalChildren();
  }, [stops, externalChildStops]);

  // Fetch child stops for selected stop (including ones outside visible area)
  useEffect(() => {
    const fetchChildStops = async () => {
      if (!selectedStop) {
        setChildStopsForSelected([]);
        return;
      }

      // Get children from visible stops first
      const visibleChildren = stops.filter(s => s.parent_station === selectedStop.stop_id);

      // Fetch the stop group to get all children (including outside view)
      setIsLoadingChildren(true);
      try {
        const group = await getStopGroup(selectedStop.stop_id);
        // Filter to only children (exclude the stop itself and any parent)
        const allChildren = group.filter(s => s.parent_station === selectedStop.stop_id);
        setChildStopsForSelected(allChildren);
      } catch (err) {
        // Fall back to visible children if API fails
        console.error('Error fetching stop group:', err);
        setChildStopsForSelected(visibleChildren);
      } finally {
        setIsLoadingChildren(false);
      }
    };

    fetchChildStops();
  }, [selectedStop?.stop_id, stops]);

  // Handle removing parent station
  const handleRemoveParent = async () => {
    if (!selectedStop) return;

    setIsSaving(true);
    setError(null);
    try {
      const updatedStop = await updateStop(selectedStop.stop_id, {
        parent_station: null,
      });
      setStops(prev => prev.map(s => (s.stop_id === updatedStop.stop_id ? updatedStop : s)));
      setSelectedStop(updatedStop);
    } catch (err) {
      handleApiError(err, 'remove parent station', setError);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle renaming stop
  const handleRename = async () => {
    if (!selectedStop || editName === selectedStop.stop_name) return;

    setIsSaving(true);
    setError(null);
    try {
      const updatedStop = await updateStop(selectedStop.stop_id, {
        stop_name: editName,
      });
      setStops(prev => prev.map(s => (s.stop_id === updatedStop.stop_id ? updatedStop : s)));
      setSelectedStop(updatedStop);
    } catch (err) {
      handleApiError(err, 'rename stop', setError);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete stop
  const handleDelete = async () => {
    if (!selectedStop) return;

    setIsSaving(true);
    setError(null);
    try {
      await deleteStop(selectedStop.stop_id);
      setStops(prev =>
        prev
          .filter(s => s.stop_id !== selectedStop.stop_id)
          .map(s =>
            s.parent_station === selectedStop.stop_id ? { ...s, parent_station: null } : s
          )
      );
      setSelectedStop(null);
      setDeleteDialogOpen(false);
    } catch (err) {
      handleApiError(err, 'delete stop', setError);
      setDeleteDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete button click - fetch trips first
  const handleDeleteClick = async () => {
    if (!selectedStop) return;
    setIsLoadingTrips(true);
    setTripsForStop([]);
    setDeleteDialogOpen(true);
    try {
      const trips = await getTripsForStop(selectedStop.stop_id);
      setTripsForStop(trips);
    } catch (err) {
      console.error('Error fetching trips for stop:', err);
    } finally {
      setIsLoadingTrips(false);
    }
  };

  // Handle stop search selection
  const handleSearchSelect = useCallback(
    async (selected: { stop_id: string; stop_name: string } | null) => {
      setSearchedStop(selected);
      if (!selected || !map.current) return;

      try {
        // Fetch the full stop data
        const stop = await getStop(selected.stop_id);
        
        // Center map on the stop
        const lat = parseFloat(String(stop.stop_lat));
        const lon = parseFloat(String(stop.stop_lon));
        map.current.flyTo({
          center: [lon, lat],
          zoom: Math.max(map.current.getZoom(), 15),
          duration: 1000,
        });

        // Select the stop
        setSelectedStop(stop);
        setEditName(stop.stop_name);
        setEditMode('none');
      } catch (err) {
        console.error('Error fetching searched stop:', err);
        setError('Failed to load stop details');
      }
    },
    []
  );

  // Use childStopsForSelected which includes stops outside the visible area
  const childStops = childStopsForSelected;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full">
      {/* Search bar */}
      <div className="p-4 border-b bg-background">
        <StopSearchInput
          placeholder="Search for a stop by name..."
          value={searchedStop}
          onChange={handleSearchSelect}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
      <StopsMap
        mapContainerRef={mapContainer as React.RefObject<HTMLDivElement>}
        isLoadingStops={isLoadingStops}
        mapReady={mapReady}
        stops={stops}
        editMode={editMode}
        setEditMode={setEditMode}
        isSaving={isSaving}
        error={error}
        setError={setError}
      />

      <StopsSidebar
        selectedStop={selectedStop}
        editName={editName}
        setEditName={setEditName}
        editMode={editMode}
        setEditMode={setEditMode}
        isSaving={isSaving}
        parentStop={parentStop}
        isLoadingParent={isLoadingParent}
        childStops={childStops}
        isLoadingChildren={isLoadingChildren}
        map={map}
        onClose={() => setSelectedStop(null)}
        onRename={handleRename}
        onRemoveParent={handleRemoveParent}
        onDeleteClick={handleDeleteClick}
        onSelectStop={stop => {
          setSelectedStop(stop);
          setEditName(stop.stop_name);
        }}
      />

      <DeleteStopDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        selectedStop={selectedStop}
        childStops={childStops}
        tripsForStop={tripsForStop}
        isLoadingTrips={isLoadingTrips}
        isSaving={isSaving}
        onDelete={handleDelete}
      />
      </div>
    </div>
  );
}
