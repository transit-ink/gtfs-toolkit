import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { Stop } from '../../types/gtfs';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

interface StopMapProps {
  stops: Stop[];
  selectedStopId?: string | null;
  onStopSelect?: (stopId: string) => void;
  /**
   * List of stop_ids where all routes passing through are metro/rail routes.
   * Used to determine which icon to show on the map marker.
   */
  metroOnlyStopIds?: string[];
}

export default function StopMap({
  stops,
  selectedStopId,
  onStopSelect,
  metroOnlyStopIds,
}: StopMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || stops.length === 0) return;

    // Find the selected stop or use the first stop for centering
    const centerStop = selectedStopId
      ? stops.find(s => s.stop_id === selectedStopId) || stops[0]
      : stops[0];

    const lat = parseFloat(String(centerStop.stop_lat));
    const lon = parseFloat(String(centerStop.stop_lon));

    // Initialize map if not already created
    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: MAP_STYLE,
        center: [lon, lat],
        zoom: 16,
        minZoom: 12,
        maxZoom: 18,
      });

      map.current.dragRotate.disable();
      map.current.touchZoomRotate.disableRotation();

      // Fit bounds if there are multiple stops (only on initial load)
      map.current.on('load', () => {
        if (stops.length > 1) {
          const bounds = new maplibregl.LngLatBounds();
          stops.forEach(stop => {
            bounds.extend([parseFloat(String(stop.stop_lon)), parseFloat(String(stop.stop_lat))]);
          });
          map.current!.fitBounds(bounds, { padding: 50, maxZoom: 17 });
        }
      });
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [stops]);

  // Update markers when selectedStopId / metroOnlyStopIds change
  useEffect(() => {
    if (!map.current || stops.length === 0) return;

    const addMarkers = () => {
      // Remove existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      const metroOnlySet = new Set(metroOnlyStopIds ?? []);

      // Add markers for all stops
      stops.forEach(stop => {
        const stopLat = parseFloat(String(stop.stop_lat));
        const stopLon = parseFloat(String(stop.stop_lon));
        const isSelected = stop.stop_id === selectedStopId;
        const isEntrance = stop.location_type === 2;
        const isMetroOnly = !isEntrance && metroOnlySet.has(stop.stop_id);

        // Base color for the pin outline/fill depending on selection/entrance
        const pinColor = isEntrance
          ? '#0ea5e9' // sky-500 for entrances
          : isSelected
            ? '#ef4444' // red for selected stop/platform
            : '#6b7280'; // grey for others

        const el = document.createElement('div');

        if (isEntrance) {
          // Entrance icon SVG, using external asset shape with dynamic pin color
          el.innerHTML = `
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 48 48"
              fill="none"
            >
              <rect width="48" height="48" fill="none" />
              <path
                d="M43 18.8002C43 30.5339 29.8449 42.7541 25.4274 46.5282C25.0158 46.8344 24.5149 47 24 47C23.4851 47 22.9842 46.8344 22.5726 46.5282C18.1551 42.7541 5 30.5339 5 18.8002C5 13.8141 7.00178 9.03219 10.565 5.50646C14.1282 1.98073 18.9609 0 24 0C29.0391 0 33.8718 1.98073 37.435 5.50646C40.9982 9.03219 43 13.8141 43 18.8002Z"
                fill="${pinColor}"
              />
              <path
                d="M22 18H22.01"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M30 26V12C30 11.4696 29.7893 10.9609 29.4142 10.5858C29.0391 10.2107 28.5304 10 28 10H20C19.4696 10 18.9609 10.2107 18.5858 10.5858C18.2107 10.9609 18 11.4696 18 12V26"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M14 26H34"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          `;
        } else if (isMetroOnly) {
          // Metro-only stop icon SVG, using external asset shape with dynamic pin color
          el.innerHTML = `
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 48 48"
              fill="none"
            >
              <rect width="48" height="48" fill="none" />
              <path
                d="M43 18.8002C43 30.5339 29.8449 42.7541 25.4274 46.5282C25.0158 46.8344 24.5149 47 24 47C23.4851 47 22.9842 46.8344 22.5726 46.5282C18.1551 42.7541 5 30.5339 5 18.8002C5 13.8141 7.00178 9.03219 10.565 5.50646C14.1282 1.98073 18.9609 0 24 0C29.0391 0 33.8718 1.98073 37.435 5.50646C40.9982 9.03219 43 13.8141 43 18.8002Z"
                fill="${pinColor}"
              />
              <path
                d="M20 9.10001V13C20 14.0609 20.4214 15.0783 21.1716 15.8284C21.9217 16.5786 22.9391 17 24 17C25.0609 17 26.0783 16.5786 26.8284 15.8284C27.5786 15.0783 28 14.0609 28 13V9.10001"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M21 21L20 20"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M27 21L28 20"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M21 25C18.2 25 16 22.8 16 20V16C16 13.8783 16.8429 11.8434 18.3431 10.3431C19.8434 8.84285 21.8783 8 24 8C26.1217 8 28.1566 8.84285 29.6569 10.3431C31.1571 11.8434 32 13.8783 32 16V20C32 22.8 29.8 25 27 25H21Z"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M20 25L18 28"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M28 25L30 28"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          `;
        } else {
          // Default bus stop icon SVG, using external asset shape with dynamic pin color
          el.innerHTML = `
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 48 48"
              fill="none"
            >
              <rect width="48" height="48" fill="none" />
              <path
                d="M43 18.8002C43 30.5339 29.8449 42.7541 25.4274 46.5282C25.0158 46.8344 24.5149 47 24 47C23.4851 47 22.9842 46.8344 22.5726 46.5282C18.1551 42.7541 5 30.5339 5 18.8002C5 13.8141 7.00178 9.03219 10.565 5.50646C14.1282 1.98073 18.9609 0 24 0C29.0391 0 33.8718 1.98073 37.435 5.50646C40.9982 9.03219 43 13.8141 43 18.8002Z"
                fill="${pinColor}"
              />
              <path
                d="M20 12V18"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M27 12V18"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M14 18H33.6"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M30 24H33C33 24 33.5 22.3 33.8 21.2C33.9 20.8 34 20.4 34 20C34 19.6 33.9 19.2 33.8 18.8L32.4 13.8C32.1 12.8 31.1 12 30 12H16C15.4696 12 14.9609 12.2107 14.5858 12.5858C14.2107 12.9609 14 13.4696 14 14V24H17"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M19 26C20.1046 26 21 25.1046 21 24C21 22.8954 20.1046 22 19 22C17.8954 22 17 22.8954 17 24C17 25.1046 17.8954 26 19 26Z"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M21 24H26"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M28 26C29.1046 26 30 25.1046 30 24C30 22.8954 29.1046 22 28 22C26.8954 22 26 22.8954 26 24C26 25.1046 26.8954 26 28 26Z"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          `;
        }

        el.style.cursor = !isEntrance && onStopSelect ? 'pointer' : 'default';

        // Add click handler to select this stop (but not for entrances)
        if (onStopSelect && !isEntrance) {
          el.addEventListener('click', e => {
            e.stopPropagation();
            onStopSelect(stop.stop_id);
          });
        }

        // Create popup
        const popup = new maplibregl.Popup({
          offset: [0, -36],
          closeButton: false,
        }).setHTML(`
          <div style="font-size: 12px; font-weight: 500; padding: 4px;">
            ${stop.stop_name}
            ${stop.stop_code ? `<br/><span style="font-weight: 400; color: #666;">Code: ${stop.stop_code}</span>` : ''}
          </div>
        `);

        // Add marker with anchor at bottom center (pin tip)
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([stopLon, stopLat])
          .setPopup(popup)
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    };

    // If map is already loaded, add markers immediately
    if (map.current.loaded()) {
      addMarkers();
    } else {
      map.current.on('load', addMarkers);
    }
  }, [stops, selectedStopId, onStopSelect, metroOnlyStopIds]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
