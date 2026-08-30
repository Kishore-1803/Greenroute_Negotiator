import type { StyleSpecification } from 'maplibre-gl';

export type MapBasemapType = 'satellite' | 'streets';

export const BASEMAP_OPTIONS: Array<{ id: MapBasemapType; label: string; icon: string }> = [
  { id: 'satellite', label: 'Satellite', icon: '🛰️' },
  { id: 'streets', label: 'Default Map', icon: '🗺️' },
];

/**
 * High-definition Google Maps Satellite Hybrid style with crisp labels and borders.
 */
export const MULTI_LAYER_MAP_STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  sources: {
    satellite_src: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '© Esri, Maxar, Earthstar Geographics',
      maxzoom: 19,
    },
    labels_src: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '© Esri, HERE, Garmin',
      maxzoom: 19,
    },
    streets_src: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
    terrain_src: {
      type: 'raster',
      tiles: [
        'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
        'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
        'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenTopoMap, SRTM',
      maxzoom: 17,
    },
  },
  layers: [
    {
      id: 'streets-layer',
      type: 'raster',
      source: 'streets_src',
      layout: { visibility: 'none' },
      paint: {
        'raster-saturation': -0.1,
        'raster-contrast': 0.05,
      },
    },
    {
      id: 'satellite-layer',
      type: 'raster',
      source: 'satellite_src',
      layout: { visibility: 'visible' },
      paint: {
        'raster-contrast': 0.12,
        'raster-saturation': 0.1,
      },
    },
    {
      id: 'terrain-layer',
      type: 'raster',
      source: 'terrain_src',
      layout: { visibility: 'none' },
      paint: {
        'raster-contrast': 0.05,
      },
    },
    {
      id: 'labels-layer',
      type: 'raster',
      source: 'labels_src',
      layout: { visibility: 'visible' },
      paint: {
        'raster-opacity': 0.95,
      },
    },
  ],
};



