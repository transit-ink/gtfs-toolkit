import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { Route, Shape, Stop } from "../types/gtfs";
import { currentInstance } from "../utils/constants";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

// Single color for all routes
const ROUTE_COLOR = "#3b82f6"; // blue

interface RouteData {
  route: Route;
  shapes: Shape[];
}

interface GroupMapProps {
  routes: RouteData[];
  stops: Stop[];
}

export default function GroupMap({ routes, stops }: GroupMapProps) {
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
    if (!map.current) return;

    const setupMap = () => {
      if (!map.current) return;

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Clean up existing route layers and sources
      const style = map.current.getStyle();
      if (style?.layers) {
        style.layers.forEach((layer) => {
          if (layer.id.startsWith("group-route-line-")) {
            map.current?.removeLayer(layer.id);
          }
        });
      }
      if (style?.sources) {
        Object.keys(style.sources).forEach((sourceId) => {
          if (sourceId.startsWith("group-route-")) {
            map.current?.removeSource(sourceId);
          }
        });
      }

      const allCoordinates: [number, number][] = [];

      // Add route lines
      routes.forEach((routeData) => {
        const color = ROUTE_COLOR;

        // Group shapes by shape_id and sort by sequence
        const shapeGroups: { [key: string]: Shape[] } = {};
        routeData.shapes.forEach((shape) => {
          if (!shapeGroups[shape.shape_id]) {
            shapeGroups[shape.shape_id] = [];
          }
          shapeGroups[shape.shape_id].push(shape);
        });

        // Sort each group by sequence
        Object.keys(shapeGroups).forEach((key) => {
          shapeGroups[key].sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence);
        });

        // Add each shape as a line
        Object.entries(shapeGroups).forEach(([shapeId, shapes]) => {
          const coordinates: [number, number][] = shapes.map((s) => [
            parseFloat(String(s.shape_pt_lon)),
            parseFloat(String(s.shape_pt_lat)),
          ]);

          allCoordinates.push(...coordinates);

          const sourceId = `group-route-${routeData.route.route_id}-${shapeId}`;
          const layerId = `group-route-line-${routeData.route.route_id}-${shapeId}`;

          map.current!.addSource(sourceId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {
                routeId: routeData.route.route_id,
                routeName: routeData.route.route_short_name,
              },
              geometry: {
                type: "LineString",
                coordinates,
              },
            },
          });

          map.current!.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": color,
              "line-width": 4,
              "line-opacity": 0.85,
            },
          });

          // Add popup on click
          map.current!.on("click", layerId, (e) => {
            new maplibregl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`
                <div style="font-size: 12px; padding: 4px;">
                  <strong>${routeData.route.route_short_name}</strong><br/>
                  ${routeData.route.route_long_name}
                </div>
              `)
              .addTo(map.current!);
          });

          // Change cursor on hover
          map.current!.on("mouseenter", layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = "pointer";
          });
          map.current!.on("mouseleave", layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = "";
          });
        });
      });

      // Add stop markers
      stops.forEach((stop, index) => {
        const lat = parseFloat(String(stop.stop_lat));
        const lon = parseFloat(String(stop.stop_lon));

        allCoordinates.push([lon, lat]);

        // Create marker element (red pin)
        const el = document.createElement("div");
        el.innerHTML = `
          <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="#ef4444"/>
            <circle cx="12" cy="12" r="5" fill="white"/>
            <text x="12" y="15" text-anchor="middle" font-size="8" fill="#ef4444" font-weight="bold">${index + 1}</text>
          </svg>
        `;
        el.style.cursor = "pointer";

        // Create popup
        const popup = new maplibregl.Popup({
          offset: [0, -36],
          closeButton: false,
        }).setHTML(`
          <div style="font-size: 12px; font-weight: 500; padding: 4px;">
            ${index + 1}. ${stop.stop_name}
          </div>
        `);

        // Add marker with anchor at bottom center (pin tip)
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([lon, lat])
          .setPopup(popup)
          .addTo(map.current!);

        markersRef.current.push(marker);
      });

      // Fit bounds to show all features
      if (allCoordinates.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        allCoordinates.forEach((coord) => bounds.extend(coord));

        map.current.fitBounds(bounds, {
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
  }, [routes, stops]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
    />
  );
}
