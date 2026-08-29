import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreGLMap, Marker, type Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Compass, Maximize2, Minus, Plus } from 'lucide-react';
import { BASEMAP_OPTIONS, MULTI_LAYER_MAP_STYLE, type MapBasemapType } from './map-style';
import { boundsForRoutes, setRouteLayers, type RouteLayerInput } from './route-layer';

interface MapViewProps {
  routes: RouteLayerInput[];
  className?: string;
}

export function MapView({ routes, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const originMarkerRef = useRef<Marker | null>(null);
  const destMarkerRef = useRef<Marker | null>(null);
  const etaMarkerRef = useRef<Marker | null>(null);
  const altEtaMarkerRef = useRef<Marker | null>(null);
  const incidentMarkerRef = useRef<Marker | null>(null);
  const routesRef = useRef(routes);
  routesRef.current = routes;

  const [activeBasemap, setActiveBasemap] = useState<MapBasemapType>('satellite');
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const updateMarkers = (map: MapLibreMap, currentRoutes: RouteLayerInput[]) => {
    const primaryRoute = currentRoutes.find((r) => r.role === 'primary') || currentRoutes[0];
    const ghostRoute = currentRoutes.find((r) => r.role === 'ghost');
    const secondaryRoute = currentRoutes.find((r) => r.role === 'secondary');

    if (!primaryRoute || primaryRoute.geometry.coordinates.length < 2) return;

    const coords = primaryRoute.geometry.coordinates;
    const originCoord = coords[0] as [number, number];
    const destCoord = coords[coords.length - 1] as [number, number];
    const midIdx = Math.floor(coords.length * 0.45);
    const midCoord = coords[midIdx] as [number, number];

    // 1. Sleek Origin Marker
    if (!originMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'origin-pin flex items-center justify-center cursor-pointer';
      el.innerHTML = `
        <div class="h-3.5 w-3.5 rounded-full bg-white border-[3px] border-[#2563eb] shadow-md"></div>
      `;
      originMarkerRef.current = new Marker({ element: el }).setLngLat(originCoord).addTo(map);
    } else {
      originMarkerRef.current.setLngLat(originCoord);
    }

    // 2. Sleek Destination Marker
    if (!destMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'dest-pin flex flex-col items-center cursor-pointer';
      el.innerHTML = `
        <div class="h-4 w-4 rounded-full bg-[#1e293b] border-[3px] border-white shadow-md flex items-center justify-center">
          <div class="h-1.5 w-1.5 rounded-full bg-white"></div>
        </div>
        <div class="w-1 h-3 bg-[#1e293b] shadow-sm"></div>
      `;
      destMarkerRef.current = new Marker({ element: el, anchor: 'bottom' }).setLngLat(destCoord).addTo(map);
    } else {
      destMarkerRef.current.setLngLat(destCoord);
    }

    // 3. Professional ETA Callout Bubble
    if (!etaMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'eta-bubble-container cursor-pointer z-10';
      el.innerHTML = `
        <div class="flex items-center gap-2 rounded-md bg-black/80 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white shadow-lg border border-white/20 transform -translate-y-2">
          <span class="w-2 h-2 rounded-full bg-[#2563eb]"></span>
          <span class="tracking-wide">Primary Route</span>
        </div>
      `;
      etaMarkerRef.current = new Marker({ element: el }).setLngLat(midCoord).addTo(map);
    } else {
      etaMarkerRef.current.setLngLat(midCoord);
    }

    // 4. Secondary Route / Alternative ETA Callout
    if (secondaryRoute && secondaryRoute.geometry.coordinates.length > 2) {
      const altCoords = secondaryRoute.geometry.coordinates;
      const altMidCoord = altCoords[Math.floor(altCoords.length * 0.55)] as [number, number];
      if (!altEtaMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'alt-eta-bubble-container cursor-pointer';
        el.innerHTML = `
          <div class="flex items-center gap-1.5 rounded-md bg-white/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-slate-800 shadow-md border border-slate-300 transform -translate-y-2">
            <span class="w-1.5 h-1.5 rounded-full bg-[#38bdf8]"></span>
            <span>Alternative</span>
          </div>
        `;
        altEtaMarkerRef.current = new Marker({ element: el }).setLngLat(altMidCoord).addTo(map);
      } else {
        altEtaMarkerRef.current.setLngLat(altMidCoord);
      }
    } else {
      altEtaMarkerRef.current?.remove();
      altEtaMarkerRef.current = null;
    }

    // 5. Traffic Surge Slowdown Badge
    if (ghostRoute && ghostRoute.geometry.coordinates.length > 2) {
      const gCoords = ghostRoute.geometry.coordinates;
      const incidentCoord = gCoords[Math.floor(gCoords.length * 0.4)] as [number, number];
      if (!incidentMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'incident-badge-container';
        el.innerHTML = `
          <div class="h-4 w-4 rounded-full bg-amber-500 border-2 border-white shadow-md flex items-center justify-center" title="Traffic Bottleneck">
             <div class="h-1.5 w-1.5 rounded-full bg-white"></div>
          </div>
        `;
        incidentMarkerRef.current = new Marker({ element: el }).setLngLat(incidentCoord).addTo(map);
      } else {
        incidentMarkerRef.current.setLngLat(incidentCoord);
      }
    } else {
      incidentMarkerRef.current?.remove();
      incidentMarkerRef.current = null;
    }
  };

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map || routes.length === 0) return;
    const bounds = boundsForRoutes(routes);
    if (bounds) {
      map.fitBounds(bounds, { padding: 48, duration: 600 });
    }
  };

  const handleZoomIn = () => {
    mapRef.current?.zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut({ duration: 300 });
  };

  const handleResetBearing = () => {
    mapRef.current?.resetNorthPitch({ duration: 400 });
  };

  const handleBasemapChange = (type: MapBasemapType) => {
    setActiveBasemap(type);
    setShowLayerMenu(false);
    const map = mapRef.current;
    if (!map) return;

    map.setLayoutProperty('streets-layer', 'visibility', type === 'streets' ? 'visible' : 'none');
    map.setLayoutProperty('satellite-layer', 'visibility', type === 'satellite' ? 'visible' : 'none');
    map.setLayoutProperty('terrain-layer', 'visibility', type === 'terrain' ? 'visible' : 'none');
    map.setLayoutProperty('labels-layer', 'visibility', type === 'satellite' ? 'visible' : 'none');
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreGLMap({
      container: containerRef.current,
      style: MULTI_LAYER_MAP_STYLE,
      center: [76.988, 11.022],
      zoom: 13,
      attributionControl: { compact: true },
      dragRotate: true,
      pitchWithRotate: true,
    });
    mapRef.current = map;

    map.on('load', () => {
      const current = routesRef.current;
      if (current.length === 0) return;
      setRouteLayers(map, current);
      updateMarkers(map, current);
      const bounds = boundsForRoutes(current);
      if (bounds) map.fitBounds(bounds, { padding: 48, animate: false });
    });

    return () => {
      originMarkerRef.current?.remove();
      destMarkerRef.current?.remove();
      etaMarkerRef.current?.remove();
      altEtaMarkerRef.current?.remove();
      incidentMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || routes.length === 0) return;

    const applyRoutes = () => {
      setRouteLayers(map, routes);
      updateMarkers(map, routes);
      const bounds = boundsForRoutes(routes);
      if (bounds) map.fitBounds(bounds, { padding: 48, duration: 500 });
    };

    if (map.isStyleLoaded()) {
      applyRoutes();
    } else {
      map.once('load', applyRoutes);
    }
  }, [routes]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={containerRef} className="h-full w-full" />

      {/* Engineering-style Layer Switcher */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            title="Toggle Map Layers"
            className="flex items-center gap-2.5 rounded-md bg-black/80 backdrop-blur-md px-3 py-2 shadow-lg border border-white/20 hover:bg-black/90 transition-all cursor-pointer text-white text-xs font-semibold tracking-wide"
          >
            <div className="flex flex-col text-left">
              <span className="text-[9px] uppercase tracking-widest text-white/50 leading-none mb-0.5">Basemap</span>
              <span className="capitalize leading-tight">{activeBasemap}</span>
            </div>
          </button>

          {showLayerMenu && (
            <div className="absolute bottom-full left-0 mb-2 flex flex-col rounded-md bg-black/90 backdrop-blur-md p-1 shadow-xl border border-white/20 min-w-[130px] animate-in fade-in zoom-in-95 duration-150">
              {BASEMAP_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleBasemapChange(opt.id)}
                  className={`px-3 py-2 text-xs font-medium transition-colors cursor-pointer rounded text-left ${
                    activeBasemap === opt.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Professional Navigation Controls */}
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
        <button
          type="button"
          onClick={handleResetBearing}
          title="Reset Bearing"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <Compass className="h-4 w-4" />
        </button>
      </div>

      {/* Professional Route Legend */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 rounded-md bg-black/80 backdrop-blur-md px-3 py-1.5 text-[10px] font-medium tracking-wide shadow-lg border border-white/20 text-white">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-[#2563eb]"></span>
          <span>Fastest Route</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-white/20 pl-3">
          <span className="h-2 w-3 rounded-sm bg-amber-500 border border-amber-300/50"></span>
          <span className="text-white/70">Surge Impact Zone</span>
        </div>
      </div>
    </div>
  );
}


