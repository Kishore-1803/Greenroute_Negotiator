import type { GeoJSONSource, LngLatBoundsLike, Map as MapLibreMap } from 'maplibre-gl';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { RouteGeometry } from '@/services/api/types';

export type RouteRole = 'primary' | 'secondary' | 'ghost';

export interface RouteLayerInput {
  mode: string;
  geometry: RouteGeometry;
  role: RouteRole;
}

const SOURCE_ID = 'greenroute-routes';
const CASING_LAYER_ID = 'greenroute-routes-casing';
const SOLID_LAYER_ID = 'greenroute-routes-solid';
const GHOST_LAYER_ID = 'greenroute-routes-ghost';

const ROLE_COLOR: Record<RouteRole, string> = {
  primary: '#2563eb', // Google Maps vibrant navigation blue
  secondary: '#38bdf8', // Alternative route cyan/light blue
  ghost: '#f59e0b', // Traffic surge amber
};
const ROLE_WIDTH: Record<RouteRole, number> = { primary: 7, secondary: 5, ghost: 4.5 };
const ROLE_OPACITY: Record<RouteRole, number> = { primary: 1.0, secondary: 0.85, ghost: 0.9 };

function toFeatureCollection(routes: RouteLayerInput[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: routes.map(
      (r): Feature => ({
        type: 'Feature',
        properties: { mode: r.mode, role: r.role },
        geometry: r.geometry as Geometry,
      }),
    ),
  };
}

export function setRouteLayers(map: MapLibreMap, routes: RouteLayerInput[]): void {
  const ordered = [
    ...routes.filter((r) => r.role === 'ghost'),
    ...routes.filter((r) => r.role === 'secondary'),
    ...routes.filter((r) => r.role === 'primary'),
  ];
  const data = toFeatureCollection(ordered);

  const existing = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
    return;
  }

  map.addSource(SOURCE_ID, { type: 'geojson', data });

  // 1. Casing Layer for high-contrast white border like Google Maps
  map.addLayer({
    id: CASING_LAYER_ID,
    type: 'line',
    source: SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#ffffff',
      'line-width': ['match', ['get', 'role'], 'primary', 11, 7.5],
      'line-opacity': 0.95,
    },
  });

  // 2. Solid Route Layer
  map.addLayer({
    id: SOLID_LAYER_ID,
    type: 'line',
    source: SOURCE_ID,
    filter: ['!=', ['get', 'role'], 'ghost'],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['match', ['get', 'role'], 'primary', ROLE_COLOR.primary, ROLE_COLOR.secondary],
      'line-width': ['match', ['get', 'role'], 'primary', ROLE_WIDTH.primary, ROLE_WIDTH.secondary],
      'line-opacity': ['match', ['get', 'role'], 'primary', ROLE_OPACITY.primary, ROLE_OPACITY.secondary],
    },
  });

  // 3. Ghost Dashed Layer (pre-surge comparison route)
  map.addLayer({
    id: GHOST_LAYER_ID,
    type: 'line',
    source: SOURCE_ID,
    filter: ['==', ['get', 'role'], 'ghost'],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ROLE_COLOR.ghost,
      'line-width': ROLE_WIDTH.ghost,
      'line-opacity': ROLE_OPACITY.ghost,
      'line-dasharray': [2.5, 2],
    },
  });
}

export function boundsForRoutes(routes: RouteLayerInput[]): LngLatBoundsLike | null {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const route of routes) {
    for (const [lon, lat] of route.geometry.coordinates) {
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
    }
  }

  if (!Number.isFinite(minLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLon) || !Number.isFinite(maxLat)) {
    return null;
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}
