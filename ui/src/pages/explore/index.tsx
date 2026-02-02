import { Button } from '@/components/ui/button';
import { currentInstance, INSTANCE_COPY } from '@/utils/constants';
import { Crosshair, Loader2 } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/sidebar';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Stop } from '../../types/gtfs';
import { StopsInBoundsParams, useStopsInBounds } from '../../utils/api';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const DEFAULT_LAT = currentInstance.mapCenter[1];
const DEFAULT_LON = currentInstance.mapCenter[0];

// Zoom limits
const MIN_ZOOM = 12;
const MIN_ZOOM_FOR_STOPS = 14;
const MAX_ZOOM = 18;
const DEFAULT_ZOOM = 15;

const BOUNDS = currentInstance.bounds;

const isWithinCityBounds = (lat: number, lon: number) => {
  return lat >= BOUNDS.south && lat <= BOUNDS.north && lon >= BOUNDS.west && lon <= BOUNDS.east;
};

export default function ExplorePage() {
  const copy = INSTANCE_COPY[currentInstance.id];
  usePageMeta({
    title: 'Explore',
    description: `Explore ${copy.cityName} bus and metro stops on a map. Find stops near you or browse the city.`,
  });

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const centerMarker = useRef<maplibregl.Marker | null>(null);
  const stopMarkersRef = useRef<maplibregl.Marker[]>([]);
  const currentPopupRef = useRef<maplibregl.Popup | null>(null);
  const navigateRef = useRef(navigate);

  const [locationPermission, setLocationPermission] = useState<
    'granted' | 'denied' | 'prompt' | 'unknown'
  >('unknown');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [mapBounds, setMapBounds] = useState<StopsInBoundsParams | null>(null);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [mapReady, setMapReady] = useState(false);

  const shouldFetchStops = mapBounds !== null && mapZoom >= MIN_ZOOM_FOR_STOPS;
  const { data: stopsData = [], isFetching: isLoadingStops } = useStopsInBounds(
    shouldFetchStops ? mapBounds : null
  );
  const stops: Stop[] = stopsData;

  // Get initial center from URL params or defaults - compute once on mount
  const initialCenter = useMemo(() => {
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const zoom = parseFloat(searchParams.get('z') || '');

    if (!isNaN(lat) && !isNaN(lng)) {
      // Ensure zoom is at least MIN_ZOOM_FOR_STOPS on page load
      const effectiveZoom = !isNaN(zoom) ? Math.max(zoom, MIN_ZOOM_FOR_STOPS) : DEFAULT_ZOOM;
      return { lat, lon: lng, zoom: effectiveZoom, hasParams: true };
    }
    return { lat: DEFAULT_LAT, lon: DEFAULT_LON, zoom: DEFAULT_ZOOM, hasParams: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only compute on mount

  const requestLocation = useCallback((forceNavigate = false) => {
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude: lat, longitude: lon } = position.coords;
        setLocationPermission('granted');
        setIsLoadingLocation(false);

        // Pan map to user location only if within city bounds
        // or if explicitly requested by user (forceNavigate)
        if (map.current && (forceNavigate || isWithinCityBounds(lat, lon))) {
          map.current.flyTo({
            center: [lon, lat],
            zoom: DEFAULT_ZOOM,
          });
        }
      },
      error => {
        console.error('Error getting location:', error);
        setIsLoadingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermission('denied');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Check initial location permission status - only auto-request if no URL params
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setLocationPermission(result.state);
        // Only auto-request if permission already granted, map is ready, AND no URL params
        if (result.state === 'granted' && map.current && !initialCenter.hasParams) {
          requestLocation();
        }
        result.onchange = () => {
          setLocationPermission(result.state);
        };
      });
    }
  }, [requestLocation, mapReady, initialCenter.hasParams]);

  const updateBoundsFromMap = useCallback(() => {
    if (!map.current) return;
    const bounds = map.current.getBounds();
    setMapZoom(map.current.getZoom());
    setMapBounds({
      minLat: Math.floor(bounds.getSouth() * 100) / 100,
      maxLat: Math.ceil(bounds.getNorth() * 100) / 100,
      minLon: Math.floor(bounds.getWest() * 100) / 100,
      maxLon: Math.ceil(bounds.getEast() * 100) / 100,
      limit: 100,
    });
  }, []);

  // Update URL with current map center (stable reference)
  const updateUrlParamsRef = useRef((lat: number, lon: number, zoom: number) => {
    setSearchParams(
      {
        lat: lat.toFixed(5),
        lng: lon.toFixed(5),
        z: zoom.toFixed(1),
      },
      { replace: true }
    );
  });

  // Keep the ref updated with latest setSearchParams
  useEffect(() => {
    updateUrlParamsRef.current = (lat: number, lon: number, zoom: number) => {
      setSearchParams(
        {
          lat: lat.toFixed(5),
          lng: lon.toFixed(5),
          z: zoom.toFixed(1),
        },
        { replace: true }
      );
    };
  }, [setSearchParams]);

  // Keep navigate ref updated
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // Initialize map - only run once on mount
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [initialCenter.lon, initialCenter.lat],
      zoom: initialCenter.zoom,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });

    map.current.dragRotate.disable();
    map.current.touchZoomRotate.disableRotation();

    // Add center marker (pin in center of map)
    const el = document.createElement('div');
    el.innerHTML = `
      <svg width="32" height="48" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="#7c3aed"/>
        <circle cx="12" cy="12" r="5" fill="white"/>
      </svg>
    `;
    el.style.pointerEvents = 'none';

    centerMarker.current = new maplibregl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(map.current.getCenter())
      .addTo(map.current);

    // Update center marker position on map move
    map.current.on('move', () => {
      if (centerMarker.current && map.current) {
        centerMarker.current.setLngLat(map.current.getCenter());
      }
    });

    // Update bounds and fetch stops on map load and after moving
    map.current.on('load', () => {
      setMapReady(true);
      updateBoundsFromMap();
    });

    // Update URL and bounds when map stops moving
    map.current.on('moveend', () => {
      if (map.current) {
        const center = map.current.getCenter();
        const zoom = map.current.getZoom();
        updateUrlParamsRef.current(center.lat, center.lng, zoom);
      }
      updateBoundsFromMap();
    });

    // Close popup when clicking on the map (but not on markers or popups)
    map.current.on('click', e => {
      // Check if click was on a marker or popup
      const target = e.originalEvent.target as HTMLElement;
      const isMarker = target.closest('.maplibregl-marker');
      const isPopup = target.closest('.maplibregl-popup');

      if (!isMarker && !isPopup && currentPopupRef.current) {
        currentPopupRef.current.remove();
        currentPopupRef.current = null;
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - initialCenter and fetchStopsInBounds are stable

  // Update stop markers when stops change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    stopMarkersRef.current.forEach(marker => marker.remove());
    stopMarkersRef.current = [];

    // Close any existing popup
    if (currentPopupRef.current) {
      currentPopupRef.current.remove();
      currentPopupRef.current = null;
    }

    // Add new markers
    stops.forEach(stop => {
      const stopLat = parseFloat(String(stop.stop_lat));
      const stopLon = parseFloat(String(stop.stop_lon));

      const el = document.createElement('div');
      el.innerHTML = `
        <svg width="20" height="30" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="#ef4444"/>
          <circle cx="12" cy="12" r="5" fill="white"/>
        </svg>
      `;
      el.style.cursor = 'pointer';
      el.style.pointerEvents = 'auto';

      // Create popup with stop info and buttons
      const popupContent = document.createElement('div');
      popupContent.style.cssText = `
        padding: 12px;
        min-width: 200px;
        font-family: system-ui, -apple-system, sans-serif;
      `;

      popupContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937; flex: 1; padding-right: 8px;">
            ${stop.stop_name}
          </h3>
          <button 
            class="popup-close-btn" 
            data-stop-id="${stop.stop_id}"
            style="
              background: none;
              border: none;
              cursor: pointer;
              padding: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #6b7280;
              border-radius: 4px;
              transition: background-color 0.2s;
            "
            onmouseover="this.style.backgroundColor='#f3f4f6'"
            onmouseout="this.style.backgroundColor='transparent'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <button 
          class="popup-view-btn" 
          data-stop-id="${stop.stop_id}"
          style="
            width: 100%;
            padding: 8px 16px;
            background-color: #7c3aed;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
          "
          onmouseover="this.style.backgroundColor='#6d28d9'"
          onmouseout="this.style.backgroundColor='#7c3aed'"
        >
          View
        </button>
      `;

      // Attach event listeners to buttons
      const closeBtn = popupContent.querySelector('.popup-close-btn');
      const viewBtn = popupContent.querySelector('.popup-view-btn');

      if (closeBtn) {
        closeBtn.addEventListener('click', e => {
          e.stopPropagation();
          if (currentPopupRef.current) {
            currentPopupRef.current.remove();
            currentPopupRef.current = null;
          }
        });
      }

      if (viewBtn) {
        viewBtn.addEventListener('click', e => {
          e.stopPropagation();
          const stopId = (e.currentTarget as HTMLElement).getAttribute('data-stop-id');
          if (stopId && navigateRef.current) {
            navigateRef.current(`/stop/${encodeURIComponent(stopId)}`);
          }
        });
      }

      const popup = new maplibregl.Popup({
        offset: [0, -36],
        closeButton: false,
        closeOnClick: false,
      }).setDOMContent(popupContent);

      // Track when this popup opens
      popup.on('open', () => {
        // Close any other open popup
        if (currentPopupRef.current && currentPopupRef.current !== popup) {
          currentPopupRef.current.remove();
        }
        currentPopupRef.current = popup;
      });

      // Track when this popup closes
      popup.on('close', () => {
        if (currentPopupRef.current === popup) {
          currentPopupRef.current = null;
        }
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([stopLon, stopLat])
        .setPopup(popup)
        .addTo(map.current!);

      stopMarkersRef.current.push(marker);
    });
  }, [stops]);

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-center gap-3 z-10 shrink-0">
        <Sidebar />
        <h1 className="text-lg font-semibold flex-1">Explore Stops</h1>
        {isLoadingStops && <Loader2 className="w-5 h-5 animate-spin" />}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative min-h-0">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Location Button */}
        {locationPermission !== 'granted' && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <Button
              onClick={() => requestLocation(true)}
              disabled={isLoadingLocation}
              className="shadow-lg"
              size="lg"
            >
              {isLoadingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Getting location...
                </>
              ) : (
                <>
                  <Crosshair className="w-4 h-4 mr-2" />
                  Set to my location
                </>
              )}
            </Button>
          </div>
        )}

        {/* Zoom hint */}
        {stops.length === 0 && !isLoadingStops && mapReady && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-background/90 px-3 py-2 rounded-md shadow text-sm">
            Zoom in to see stops
          </div>
        )}

        {/* My Location FAB when permission granted */}
        {locationPermission === 'granted' && (
          <div className="absolute bottom-6 right-4 z-10">
            <Button
              variant="secondary"
              size="icon"
              className="shadow-lg rounded-full w-12 h-12"
              onClick={() => requestLocation(true)}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Crosshair className="w-5 h-5" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
