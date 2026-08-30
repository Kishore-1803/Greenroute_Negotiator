import type { GeoJsonGeometry } from '../../services/api/types';

export interface RouteGeometryInput {
  mode: string;
  geometry: GeoJsonGeometry;
  role: 'primary' | 'secondary' | 'ghost';
}
