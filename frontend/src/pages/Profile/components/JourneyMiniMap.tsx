import { useEffect, useRef } from 'react';
import { Map as MapLibreGLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MULTI_LAYER_MAP_STYLE } from '@/features/map/map-style';

interface JourneyMiniMapProps {
  coordinates: [number, number][];
  className?: string;
}

export function JourneyMiniMap({ coordinates, className }: JourneyMiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreGLMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || coordinates.length < 2) return;

    // Calculate bounds
    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;

    for (const [lon, lat] of coordinates) {
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
    }

    const midLon = (minLon + maxLon) / 2;
    const midLat = (minLat + maxLat) / 2;

    const map = new MapLibreGLMap({
      container: containerRef.current,
      style: MULTI_LAYER_MAP_STYLE,
      center: [midLon, midLat],
      zoom: 12,
      attributionControl: false,
      interactive: true,
      scrollZoom: false, // Don't hijack page scrolling
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;

    map.on('load', () => {
      // 1. Add Route GeoJSON Source
      map.addSource('journey-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      });

      // 2. White casing layer for high contrast on satellite imagery
      map.addLayer({
        id: 'journey-casing',
        type: 'line',
        source: 'journey-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#ffffff',
          'line-width': 7,
          'line-opacity': 0.95,
        },
      });

      // 3. Solid Google Maps style navigation blue line
      map.addLayer({
        id: 'journey-line',
        type: 'line',
        source: 'journey-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#2563eb',
          'line-width': 4.5,
          'line-opacity': 1.0,
        },
      });

      // 4. Origin Marker (sleek white circle with blue inner)
      const originCoord = coordinates[0];
      const originEl = document.createElement('div');
      originEl.className = 'origin-mini-pin flex items-center justify-center pointer-events-none';
      originEl.innerHTML = `
        <div class="h-3 w-3 rounded-full bg-white border-[2.5px] border-[#2563eb] shadow-md"></div>
      `;
      new Marker({ element: originEl }).setLngLat(originCoord).addTo(map);

      // 5. Destination Marker (dark pin with white dot)
      const destCoord = coordinates[coordinates.length - 1];
      const destEl = document.createElement('div');
      destEl.className = 'dest-mini-pin flex items-center justify-center pointer-events-none';
      destEl.innerHTML = `
        <div class="h-3.5 w-3.5 rounded-full bg-[#111827] border-[2px] border-white shadow-md flex items-center justify-center">
          <div class="h-1 w-1 rounded-full bg-white"></div>
        </div>
      `;
      new Marker({ element: destEl }).setLngLat(destCoord).addTo(map);

      // 6. Fit Bounds to make entire route visible
      map.fitBounds(
        [
          [minLon, minLat],
          [maxLon, maxLat],
        ],
        { padding: 36, animate: false }
      );
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [coordinates]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className ?? ''}`}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
