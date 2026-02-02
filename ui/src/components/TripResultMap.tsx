import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { Shape, Stop, StopTime } from "../types/gtfs";
import { currentInstance } from "../utils/constants";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

interface RouteSegment {
  routeId: string;
  routeShortName: string;
  shapes: Shape[];
  stopTimes: StopTime[];
  stops: Stop[];
  color: string;
}

interface TripResultMapProps {
  segments: RouteSegment[];
  fromStop: Stop;
  toStop: Stop;
  interchangeStop?: Stop;
  allStops: Stop[];
}

// Calculate distance between two points (in degrees, for comparison purposes)
function distanceSquared(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  return dLat * dLat + dLon * dLon;
}

// Find the index of the closest shape point to a given stop
function findClosestShapePointIndex(
  shapes: Shape[],
  stopLat: number,
  stopLon: number
): number {
  let closestIndex = 0;
  let closestDistance = Infinity;

  shapes.forEach((shape, index) => {
    const shapeLat = parseFloat(String(shape.shape_pt_lat));
    const shapeLon = parseFloat(String(shape.shape_pt_lon));
    const dist = distanceSquared(stopLat, stopLon, shapeLat, shapeLon);
    if (dist < closestDistance) {
      closestDistance = dist;
      closestIndex = index;
    }
  });

  return closestIndex;
}

// Extract the portion of the shape between two stops
function getShapeSegment(
  shapes: Shape[],
  startStop: Stop,
  endStop: Stop
): [number, number][] {
  if (shapes.length === 0) {
    return [];
  }

  // Sort shapes by sequence
  const sortedShapes = [...shapes].sort(
    (a, b) => a.shape_pt_sequence - b.shape_pt_sequence
  );

  const startLat = parseFloat(String(startStop.stop_lat));
  const startLon = parseFloat(String(startStop.stop_lon));
  const endLat = parseFloat(String(endStop.stop_lat));
  const endLon = parseFloat(String(endStop.stop_lon));

  // Find closest shape points to start and end stops
  const startIndex = findClosestShapePointIndex(sortedShapes, startLat, startLon);
  const endIndex = findClosestShapePointIndex(sortedShapes, endLat, endLon);

  // Ensure we go from lower to higher index
  const fromIndex = Math.min(startIndex, endIndex);
  const toIndex = Math.max(startIndex, endIndex);

  // Extract the segment (include one extra point on each side if available for smoother connection)
  const segmentStart = Math.max(0, fromIndex);
  const segmentEnd = Math.min(sortedShapes.length - 1, toIndex);

  const coordinates: [number, number][] = [];
  for (let i = segmentStart; i <= segmentEnd; i++) {
    const shape = sortedShapes[i];
    coordinates.push([
      parseFloat(String(shape.shape_pt_lon)),
      parseFloat(String(shape.shape_pt_lat)),
    ]);
  }

  return coordinates;
}

export default function TripResultMap({
  segments,
  fromStop,
  toStop,
  interchangeStop,
  allStops,
}: TripResultMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

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
    };
  }, []);

  useEffect(() => {
    if (!map.current || segments.length === 0) return;

    const setupMap = () => {
      if (!map.current) return;

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Remove existing layers and sources
      segments.forEach((_, index) => {
        const layerId = `route-line-${index}`;
        const sourceId = `route-${index}`;
        if (map.current!.getLayer(layerId)) {
          map.current!.removeLayer(layerId);
        }
        if (map.current!.getSource(sourceId)) {
          map.current!.removeSource(sourceId);
        }
      });

      const bounds = new maplibregl.LngLatBounds();

      // Add route lines for each segment using shape data
      // This shows the actual route path clipped to the relevant portion
      segments.forEach((segment, index) => {
        // Sort stops by stop_sequence from stopTimes to find first and last stops
        const sortedStopTimes = [...segment.stopTimes].sort(
          (a, b) => a.stop_sequence - b.stop_sequence
        );

        if (sortedStopTimes.length === 0) return;

        // Find first and last stops of this segment
        const firstStopTime = sortedStopTimes[0];
        const lastStopTime = sortedStopTimes[sortedStopTimes.length - 1];
        const firstStop = segment.stops.find((s) => s.stop_id === firstStopTime.stop_id);
        const lastStop = segment.stops.find((s) => s.stop_id === lastStopTime.stop_id);

        let coordinates: [number, number][] = [];

        // Try to use shape data if available
        if (segment.shapes.length > 0 && firstStop && lastStop) {
          coordinates = getShapeSegment(segment.shapes, firstStop, lastStop);
        }

        // Fallback to stop coordinates if no shape data or extraction failed
        if (coordinates.length < 2) {
          coordinates = sortedStopTimes
            .map((st) => {
              const stop = segment.stops.find((s) => s.stop_id === st.stop_id);
              if (!stop) return null;
              return [
                parseFloat(String(stop.stop_lon)),
                parseFloat(String(stop.stop_lat)),
              ] as [number, number];
            })
            .filter((coord): coord is [number, number] => coord !== null);
        }

        if (coordinates.length === 0) return;

        // Extend bounds
        coordinates.forEach((coord) => bounds.extend(coord));

        // Add route line source
        map.current!.addSource(`route-${index}`, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates,
            },
          },
        });

        // Add route line layer
        map.current!.addLayer({
          id: `route-line-${index}`,
          type: "line",
          source: `route-${index}`,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": segment.color,
            "line-width": 5,
            "line-opacity": 0.8,
          },
        });
      });

      // Add intermediate stop markers (smaller, less prominent)
      const specialStopIds = new Set([
        fromStop.stop_id,
        toStop.stop_id,
        interchangeStop?.stop_id,
      ].filter(Boolean));

      allStops.forEach((stop) => {
        if (specialStopIds.has(stop.stop_id)) return;

        const lat = parseFloat(String(stop.stop_lat));
        const lon = parseFloat(String(stop.stop_lon));
        bounds.extend([lon, lat]);

        // Create marker element
        const el = document.createElement("div");
        el.style.width = "10px";
        el.style.height = "10px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = "#94a3b8";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
        el.style.cursor = "pointer";

        // Create popup
        const popup = new maplibregl.Popup({
          offset: 15,
          closeButton: false,
        }).setHTML(`
          <div style="font-size: 12px; padding: 4px;">
            ${stop.stop_name}
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lon, lat])
          .setPopup(popup)
          .addTo(map.current!);

        markersRef.current.push(marker);
      });

      // Add from stop marker (green, larger)
      const fromLat = parseFloat(String(fromStop.stop_lat));
      const fromLon = parseFloat(String(fromStop.stop_lon));
      bounds.extend([fromLon, fromLat]);

      const fromEl = document.createElement("div");
      fromEl.style.width = "24px";
      fromEl.style.height = "24px";
      fromEl.style.borderRadius = "50%";
      fromEl.style.backgroundColor = "#22c55e";
      fromEl.style.border = "3px solid white";
      fromEl.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
      fromEl.style.cursor = "pointer";
      fromEl.style.display = "flex";
      fromEl.style.alignItems = "center";
      fromEl.style.justifyContent = "center";

      const fromInner = document.createElement("div");
      fromInner.style.width = "8px";
      fromInner.style.height = "8px";
      fromInner.style.borderRadius = "50%";
      fromInner.style.backgroundColor = "white";
      fromEl.appendChild(fromInner);

      const fromPopup = new maplibregl.Popup({
        offset: 25,
        closeButton: false,
      }).setHTML(`
        <div style="font-size: 12px; font-weight: 600; padding: 4px; color: #22c55e;">
          START: ${fromStop.stop_name}
        </div>
      `);

      const fromMarker = new maplibregl.Marker({ element: fromEl })
        .setLngLat([fromLon, fromLat])
        .setPopup(fromPopup)
        .addTo(map.current!);

      markersRef.current.push(fromMarker);

      // Add to stop marker (red, larger)
      const toLat = parseFloat(String(toStop.stop_lat));
      const toLon = parseFloat(String(toStop.stop_lon));
      bounds.extend([toLon, toLat]);

      const toEl = document.createElement("div");
      toEl.style.width = "24px";
      toEl.style.height = "24px";
      toEl.style.borderRadius = "50%";
      toEl.style.backgroundColor = "#ef4444";
      toEl.style.border = "3px solid white";
      toEl.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
      toEl.style.cursor = "pointer";
      toEl.style.display = "flex";
      toEl.style.alignItems = "center";
      toEl.style.justifyContent = "center";

      const toInner = document.createElement("div");
      toInner.style.width = "8px";
      toInner.style.height = "8px";
      toInner.style.borderRadius = "50%";
      toInner.style.backgroundColor = "white";
      toEl.appendChild(toInner);

      const toPopup = new maplibregl.Popup({
        offset: 25,
        closeButton: false,
      }).setHTML(`
        <div style="font-size: 12px; font-weight: 600; padding: 4px; color: #ef4444;">
          END: ${toStop.stop_name}
        </div>
      `);

      const toMarker = new maplibregl.Marker({ element: toEl })
        .setLngLat([toLon, toLat])
        .setPopup(toPopup)
        .addTo(map.current!);

      markersRef.current.push(toMarker);

      // Add interchange stop marker (blue, larger) if exists
      if (interchangeStop) {
        const interLat = parseFloat(String(interchangeStop.stop_lat));
        const interLon = parseFloat(String(interchangeStop.stop_lon));
        bounds.extend([interLon, interLat]);

        const interEl = document.createElement("div");
        interEl.style.width = "24px";
        interEl.style.height = "24px";
        interEl.style.borderRadius = "50%";
        interEl.style.backgroundColor = "#3b82f6";
        interEl.style.border = "3px solid white";
        interEl.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
        interEl.style.cursor = "pointer";
        interEl.style.display = "flex";
        interEl.style.alignItems = "center";
        interEl.style.justifyContent = "center";

        const interInner = document.createElement("div");
        interInner.style.width = "8px";
        interInner.style.height = "8px";
        interInner.style.borderRadius = "50%";
        interInner.style.backgroundColor = "white";
        interEl.appendChild(interInner);

        const interPopup = new maplibregl.Popup({
          offset: 25,
          closeButton: false,
        }).setHTML(`
          <div style="font-size: 12px; font-weight: 600; padding: 4px; color: #3b82f6;">
            CHANGE: ${interchangeStop.stop_name}
          </div>
        `);

        const interMarker = new maplibregl.Marker({ element: interEl })
          .setLngLat([interLon, interLat])
          .setPopup(interPopup)
          .addTo(map.current!);

        markersRef.current.push(interMarker);
      }

      // Fit bounds to show everything
      if (!bounds.isEmpty()) {
        map.current!.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15,
        });
      }
    };

    if (map.current.loaded()) {
      setupMap();
    } else {
      map.current.on("load", setupMap);
    }
  }, [segments, fromStop, toStop, interchangeStop, allStops]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
    />
  );
}
