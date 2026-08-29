import { useEffect, useRef, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { Key, Layers, Maximize2, Minus, Plus, RefreshCw } from 'lucide-react';
import type { RouteLayerInput } from './route-layer';
import type { CooperationResponse } from '@/services/api/types';

interface MapViewProps {
  routes: RouteLayerInput[];
  cooperationData?: CooperationResponse;
  className?: string;
}

export function MapView({ routes, cooperationData, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);

  const [activeMapType, setActiveMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // 1. Initialize Google Map
  useEffect(() => {
    if (!containerRef.current) return;

    if (!apiKey) {
      setLoading(false);
      setError('MISSING_KEY');
      return;
    }

    setLoading(true);
    setError(null);

    setOptions({
      key: apiKey,
      v: 'weekly',
    });

    importLibrary('maps')
      .then(() => {
        if (!containerRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
          center: { lat: 13.0300, lng: 80.2300 }, // Default Chennai
          zoom: 14,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: true, // We provide modern dark-glass UI controls
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        mapRef.current = map;
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error('Google Maps API failed to load:', err);
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Failed to initialize Google Maps');
      });

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      markersRef.current.forEach((m) => m.setMap(null));
      infoWindowsRef.current.forEach((i) => i.close());
      mapRef.current = null;
    };
  }, [apiKey]);

  // 2. Render Polylines & Markers whenever routes change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof google === 'undefined' || !google.maps) return;

    // Clear existing polylines, markers, infoWindows
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    infoWindowsRef.current.forEach((i) => i.close());
    infoWindowsRef.current = [];

    if (!routes || routes.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    // Order: ghost underneath, then secondary, then primary on top
    const sortedRoutes = [
      ...routes.filter((r) => r.role === 'ghost'),
      ...routes.filter((r) => r.role === 'secondary'),
      ...routes.filter((r) => r.role === 'primary'),
    ];

    sortedRoutes.forEach((route) => {
      if (!route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length === 0) return;

      // Convert GeoJSON [lon, lat] -> Google Maps { lat, lng }
      const path = route.geometry.coordinates.map(([lon, lat]) => {
        const pt = new google.maps.LatLng(lat, lon);
        bounds.extend(pt);
        return pt;
      });

      const isPrimary = route.role === 'primary';
      const isGhost = route.role === 'ghost';

      // High-contrast white casing for primary route (Google Maps style)
      if (isPrimary) {
        const casing = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#ffffff',
          strokeOpacity: 0.95,
          strokeWeight: 10,
          zIndex: 10,
          map,
        });
        polylinesRef.current.push(casing);
      }

      // Colored solid or dashed polyline
      const line = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: isGhost ? '#f59e0b' : isPrimary ? '#2563eb' : '#38bdf8',
        strokeOpacity: isGhost ? 0.85 : isPrimary ? 1.0 : 0.75,
        strokeWeight: isPrimary ? 6 : isGhost ? 4.5 : 4,
        zIndex: isPrimary ? 20 : isGhost ? 5 : 15,
        icons: isGhost
          ? [
              {
                icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                offset: '0',
                repeat: '15px',
              },
            ]
          : undefined,
        map,
      });

      polylinesRef.current.push(line);
    });

    // 3. Origin & Destination Markers on Primary Route
    const primaryRoute = routes.find((r) => r.role === 'primary') || routes[0];
    if (primaryRoute && primaryRoute.geometry.coordinates.length > 1) {
      const coords = primaryRoute.geometry.coordinates;
      const [oLon, oLat] = coords[0];
      const [dLon, dLat] = coords[coords.length - 1];

      // Origin Pin
      const originMarker = new google.maps.Marker({
        position: { lat: oLat, lng: oLon },
        map,
        title: 'Trip Origin',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        zIndex: 50,
      });
      markersRef.current.push(originMarker);

      // Destination Pin
      const destMarker = new google.maps.Marker({
        position: { lat: dLat, lng: dLon },
        map,
        title: 'Trip Destination',
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: '#1e293b',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
          scale: 1.5,
          anchor: new google.maps.Point(12, 22),
        },
        zIndex: 50,
      });
      markersRef.current.push(destMarker);

      // Midpoint ETA Callout
      const midIdx = Math.floor(coords.length * 0.45);
      const [mLon, mLat] = coords[midIdx];
      const etaWindow = new google.maps.InfoWindow({
        position: { lat: mLat, lng: mLon },
        content: `
          <div style="font-family: inherit; font-size: 11px; font-weight: 700; color: #1e293b; padding: 2px 4px;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#2563eb; margin-right:4px;"></span>
            ${primaryRoute.mode.toUpperCase()} (Selected)
          </div>
        `,
        disableAutoPan: true,
      });
      etaWindow.open(map);
      infoWindowsRef.current.push(etaWindow);
    }

    // Fit route bounds nicely
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 50);
    }
  }, [routes, cooperationData]);

  // Controls Handlers
  const handleZoomIn = () => {
    const map = mapRef.current;
    if (map) map.setZoom((map.getZoom() || 14) + 1);
  };

  const handleZoomOut = () => {
    const map = mapRef.current;
    if (map) map.setZoom((map.getZoom() || 14) - 1);
  };

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map || !routes || routes.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    routes.forEach((r) => {
      r.geometry?.coordinates?.forEach(([lon, lat]) => {
        bounds.extend(new google.maps.LatLng(lat, lon));
      });
    });
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 50);
    }
  };

  const handleMapTypeChange = (type: 'roadmap' | 'satellite' | 'hybrid' | 'terrain') => {
    setActiveMapType(type);
    setShowLayerMenu(false);
    if (!mapRef.current) return;

    if (type === 'roadmap') mapRef.current.setMapTypeId(google.maps.MapTypeId.ROADMAP);
    if (type === 'satellite') mapRef.current.setMapTypeId(google.maps.MapTypeId.SATELLITE);
    if (type === 'hybrid') mapRef.current.setMapTypeId(google.maps.MapTypeId.HYBRID);
    if (type === 'terrain') mapRef.current.setMapTypeId(google.maps.MapTypeId.TERRAIN);
  };

  if (error === 'MISSING_KEY') {
    return (
      <div className={`relative flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 text-white rounded-2xl border border-white/10 ${className}`}>
        <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center mb-3">
          <Key className="h-6 w-6 text-amber-400" />
        </div>
        <h3 className="text-sm font-bold tracking-tight text-white mb-1">Google Maps API Key Required</h3>
        <p className="text-xs text-white/60 max-w-sm mb-4 leading-relaxed">
          Add your Google Maps JavaScript API key to <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-300">frontend/.env</code> to activate the live map.
        </p>
        <div className="bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-[11px] font-mono text-white/80 select-all">
          VITE_GOOGLE_MAPS_API_KEY=your_key_here
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={containerRef} className="h-full w-full" />

      {loading && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-xs text-white z-30">
          <RefreshCw className="h-4 w-4 animate-spin text-[#8EE074] mr-2" />
          <span>Loading Google Maps…</span>
        </div>
      )}

      {/* Layer Switcher (Roadmap, Satellite, Hybrid, Terrain) */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            title="Toggle Map Style"
            className="flex items-center gap-2.5 rounded-md bg-black/80 backdrop-blur-md px-3 py-2 shadow-lg border border-white/20 hover:bg-black/90 transition-all cursor-pointer text-white text-xs font-semibold tracking-wide"
          >
            <Layers className="h-3.5 w-3.5 text-[#8EE074]" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] uppercase tracking-widest text-white/50 leading-none mb-0.5">Basemap</span>
              <span className="capitalize leading-tight">{activeMapType}</span>
            </div>
          </button>

          {showLayerMenu && (
            <div className="absolute bottom-full left-0 mb-2 flex flex-col rounded-md bg-black/90 backdrop-blur-md p-1 shadow-xl border border-white/20 min-w-[130px] animate-in fade-in zoom-in-95 duration-150">
              {(['roadmap', 'satellite', 'hybrid', 'terrain'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleMapTypeChange(type)}
                  className={`px-3 py-2 text-xs font-medium transition-colors cursor-pointer rounded text-left capitalize ${
                    activeMapType === type ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modern Navigation Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 rounded-md bg-black/80 backdrop-blur-md p-1 shadow-lg border border-white/20 text-white">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="h-px w-full bg-white/10 my-0.5" />
        <button
          type="button"
          onClick={handleRecenter}
          title="Fit Route Bounds"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Route Legend */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 rounded-md bg-black/80 backdrop-blur-md px-3 py-1.5 text-[10px] font-medium tracking-wide shadow-lg border border-white/20 text-white">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-[#2563eb]"></span>
          <span>Selected Route</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-white/20 pl-3">
          <span className="h-2 w-3 rounded-sm bg-amber-500 border border-amber-300/50"></span>
          <span className="text-white/70">Surge Slowdown</span>
        </div>
      </div>
    </div>
  );
}
