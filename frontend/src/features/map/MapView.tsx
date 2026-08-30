import { useEffect, useRef, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { Key, Maximize2, Minus, Plus, RefreshCw } from 'lucide-react';
import { LayerIcon, SatelliteIcon, MapMinimalIcon, TerrainMinimalIcon } from '@/components/ui/MapIcons';
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMapType, setCurrentMapType] = useState<'roadmap' | 'hybrid' | 'terrain'>('roadmap');

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
          disableDefaultUI: true, // We provide modern dark-glass UI controls for zoom
          zoomControl: false,
          mapTypeControl: false, // Replaced with custom minimalist glass Layer/Satellite switcher
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

      if (isPrimary && route.traffic_segments && route.traffic_segments.length > 0) {
        // Draw the full blue line first as a base to prevent gaps between segments
        const baseLine = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#2563eb', // base blue
          strokeOpacity: 1.0,
          strokeWeight: 6,
          zIndex: 15,
          map,
        });
        polylinesRef.current.push(baseLine);

        // Render only mild/heavy traffic segments over the base line
        route.traffic_segments.forEach((seg) => {
          if (seg.level === 'clear') return; // let base line show

          const segmentPath = path.slice(seg.start_idx, seg.end_idx + 1);
          const color = seg.level === 'heavy' ? '#ef4444' : '#facc15';

          const segmentLine = new google.maps.Polyline({
            path: segmentPath,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: 1.0,
            strokeWeight: 6,
            zIndex: 20, // above the base line
            map,
          });
          polylinesRef.current.push(segmentLine);
        });
      } else {
        // Colored solid or dashed polyline (fallback or non-primary)
        const line = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: isGhost ? '#f59e0b' : isPrimary ? '#2563eb' : '#94a3b8', // slate-400 for secondary
          strokeOpacity: isGhost ? 0.85 : isPrimary ? 1.0 : 0.8,
          strokeWeight: isPrimary ? 6 : isGhost ? 4.5 : 4,
          zIndex: isPrimary ? 15 : isGhost ? 5 : 12,
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
      }

      // Render transit stops if present
      if (route.stops && route.stops.length > 0) {
        route.stops.forEach(([lon, lat], idx) => {
          const stopMarker = new google.maps.Marker({
            position: { lat, lng: lon },
            map,
            title: `Stop ${idx + 1}`,
            label: {
              text: (idx + 1).toString(),
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 'bold',
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#1e293b',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            zIndex: 60,
          });
          markersRef.current.push(stopMarker);
        });
      }
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
      const distStr = primaryRoute.distance_km != null ? `${primaryRoute.distance_km.toFixed(1)} km` : '';
      const durStr = primaryRoute.duration_min != null ? `${Math.round(primaryRoute.duration_min)} min` : '';
      const costStr = primaryRoute.estimated_cost_inr != null ? `₹${Math.round(primaryRoute.estimated_cost_inr)}` : '';
      const co2Str = primaryRoute.estimated_carbon_g != null ? `${Math.round(primaryRoute.estimated_carbon_g)}g CO₂` : '';
      
      const statsHtml = [distStr, durStr, costStr, co2Str].filter(Boolean).join(' • ');

      const etaWindow = new google.maps.InfoWindow({
        position: { lat: mLat, lng: mLon },
        content: `
          <div style="font-family: inherit; padding: 4px 6px; min-width: 140px;">
            <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 4px; display: flex; align-items: center;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#2563eb; margin-right:6px;"></span>
              ${primaryRoute.mode.toUpperCase()} (Selected)
            </div>
            <div style="font-size: 11px; color: #475569; font-weight: 500;">
              ${statsHtml}
            </div>
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

  const handleMapTypeChange = (type: 'roadmap' | 'hybrid' | 'terrain') => {
    setCurrentMapType(type);
    const map = mapRef.current;
    if (!map || typeof google === 'undefined') return;
    if (type === 'roadmap') map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
    else if (type === 'hybrid') map.setMapTypeId(google.maps.MapTypeId.HYBRID);
    else if (type === 'terrain') map.setMapTypeId(google.maps.MapTypeId.TERRAIN);
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

      {/* Minimalist Layer & Satellite Basemap Switcher */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1 rounded-2xl bg-black/80 backdrop-blur-xl p-1.5 shadow-2xl border border-white/20 text-white transition-all">
        {/* Layer Icon Indicator */}
        <div className="flex items-center justify-center pl-2 pr-1 text-[#8EE074]" title="Map View Layers">
          <LayerIcon size={16} strokeWidth={1.85} />
        </div>

        <div className="h-4 w-px bg-white/15 mx-0.5" />

        {/* Default Vector Map */}
        <button
          type="button"
          onClick={() => handleMapTypeChange('roadmap')}
          title="Vector Streets Map"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            currentMapType === 'roadmap'
              ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/30'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <MapMinimalIcon size={14} strokeWidth={1.85} className={currentMapType === 'roadmap' ? 'text-[#8EE074]' : 'text-white/60'} />
          <span className="hidden sm:inline">Map</span>
        </button>

        {/* Satellite Hybrid */}
        <button
          type="button"
          onClick={() => handleMapTypeChange('hybrid')}
          title="Satellite Imagery + Transit Overlays"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            currentMapType === 'hybrid'
              ? 'bg-[#4D7C3E]/85 text-white shadow-sm ring-1 ring-[#8EE074]/40'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <SatelliteIcon size={14} strokeWidth={1.85} className={currentMapType === 'hybrid' ? 'text-[#8EE074]' : 'text-white/60'} />
          <span className="hidden sm:inline">Satellite</span>
        </button>

        {/* Topography / Terrain */}
        <button
          type="button"
          onClick={() => handleMapTypeChange('terrain')}
          title="Topographic Terrain"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            currentMapType === 'terrain'
              ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/30'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <TerrainMinimalIcon size={14} strokeWidth={1.85} className={currentMapType === 'terrain' ? 'text-[#8EE074]' : 'text-white/60'} />
          <span className="hidden sm:inline">Terrain</span>
        </button>
      </div>

      {/* Modern Navigation Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 rounded-2xl bg-black/80 backdrop-blur-xl p-1.5 shadow-2xl border border-white/20 text-white">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="h-px w-full bg-white/10 my-0.5" />
        <button
          type="button"
          onClick={handleRecenter}
          title="Fit Route Bounds"
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Route Legend */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4.5 rounded-full bg-black/50 backdrop-blur-xl px-5 py-2.5 text-[11px] font-semibold tracking-wide shadow-2xl border border-white/10 transition-all hover:bg-black/70 hover:border-white/20">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
          <span className="text-white">Clear</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#facc15] shadow-[0_0_8px_rgba(250,204,21,0.8)]"></span>
          <span className="text-white/80">Mild</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
          <span className="text-white/80">Heavy</span>
        </div>
      </div>
    </div>
  );
}
