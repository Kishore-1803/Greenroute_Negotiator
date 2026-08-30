import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { Navigation } from 'lucide-react-native';
import { colors, radii } from '../../theme/tokens';
import type { TravelMode } from '../../types/mode';
import type { RouteGeometryInput } from './routeMapTypes';

export type { RouteGeometryInput } from './routeMapTypes';

interface RouteMapProps {
  routes?: RouteGeometryInput[];
  selectedMode?: TravelMode;
  originLabel?: string;
  destinationLabel?: string;
}

interface Point {
  lat: number;
  lon: number;
}

interface DrawableRoute {
  mode: string;
  role: 'primary' | 'secondary' | 'ghost';
  points: Point[];
}

function colorFor(r: DrawableRoute): string {
  if (r.role === 'primary') return '#8EE074';
  if (r.role === 'ghost') return '#ef4444';
  if (r.mode === 'two_wheeler') return '#FBBF24';
  if (r.mode === 'cycling') return '#38BDF8';
  return 'rgba(255,255,255,0.45)';
}

function normalizeRoutes(routes: RouteGeometryInput[]): DrawableRoute[] {
  return routes
    .map((r): DrawableRoute | null => {
      if (r.geometry?.type !== 'LineString' || !Array.isArray(r.geometry.coordinates)) return null;
      const points = (r.geometry.coordinates as any[])
        .filter((c) => Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
        .map((c) => ({ lon: c[0], lat: c[1] }));
      if (points.length < 2) return null;
      return { mode: r.mode, role: r.role, points };
    })
    .filter((r): r is DrawableRoute => r !== null);
}

// No native map SDK on web (react-native-maps is a native-only module -- importing it here
// breaks the web bundle entirely, per Metro's platform-file resolution: this file is what web
// actually loads instead of RouteMap.tsx). This renders the same route geometry the backend
// already returns as a lightweight static projection instead, rather than an interactive
// basemap -- honest about the tradeoff, not a broken map.
export const RouteMap: React.FC<RouteMapProps> = ({
  routes = [],
  originLabel = 'Gandhipuram',
  destinationLabel = 'RS Puram',
}) => {
  const screenWidth = Dimensions.get('window').width - 32;
  const width = Math.max(300, Math.min(screenWidth, 700));
  const height = 220;
  const pad = 24;

  const normalizedRoutes = useMemo(() => normalizeRoutes(routes), [routes]);
  const primaryRoute = normalizedRoutes.find((r) => r.role === 'primary') || normalizedRoutes[0];

  const projected = useMemo(() => {
    const allPoints = normalizedRoutes.flatMap((r) => r.points);
    if (allPoints.length === 0) return null;

    const lats = allPoints.map((p) => p.lat);
    const lons = allPoints.map((p) => p.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const latSpan = maxLat - minLat || 0.001;
    const lonSpan = maxLon - minLon || 0.001;

    function project(p: Point) {
      const x = pad + ((p.lon - minLon) / lonSpan) * (width - pad * 2);
      const y = height - (pad + ((p.lat - minLat) / latSpan) * (height - pad * 2));
      return { x, y };
    }

    return normalizedRoutes.map((r) => ({
      ...r,
      screenPoints: r.points.map(project),
    }));
  }, [normalizedRoutes, width]);

  const showStatus = !projected;
  const primaryScreenPoints = projected?.find((r) => r.role === 'primary')?.screenPoints
    || projected?.[0]?.screenPoints;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {projected?.map((r, idx) => (
          <Polyline
            key={`${r.mode}-${r.role}-${idx}`}
            points={r.screenPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={colorFor(r)}
            strokeWidth={r.role === 'primary' ? 4 : 2.5}
            strokeDasharray={r.role === 'ghost' ? '6,6' : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {primaryScreenPoints && primaryScreenPoints.length > 0 && (
          <>
            <Circle
              cx={primaryScreenPoints[0].x}
              cy={primaryScreenPoints[0].y}
              r={6}
              fill="#fff"
              stroke="#000"
              strokeWidth={2}
            />
            <Circle
              cx={primaryScreenPoints[primaryScreenPoints.length - 1].x}
              cy={primaryScreenPoints[primaryScreenPoints.length - 1].y}
              r={7}
              fill={colors.primaryBright}
              stroke="#000"
              strokeWidth={2}
            />
          </>
        )}
      </Svg>

      {showStatus && (
        <View style={[styles.placeholder, StyleSheet.absoluteFill]} pointerEvents="none">
          <Text style={styles.placeholderText}>Fetching route…</Text>
        </View>
      )}

      <View style={styles.topInfoBar} pointerEvents="none">
        <View style={styles.badgeRow}>
          <View style={styles.pinDot} />
          <Text style={styles.badgeText} numberOfLines={1}>
            {originLabel} → {destinationLabel}
          </Text>
        </View>
        <View style={styles.liveIndicator}>
          <Navigation size={10} color={colors.primaryBright} />
          <Text style={styles.liveText}>Route preview</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: 'relative',
    marginVertical: 6,
    backgroundColor: '#0B140F',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 20, 15, 0.6)',
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  topInfoBar: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    maxWidth: '70%',
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryBright,
    marginRight: 6,
  },
  badgeText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: '700',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 224, 116, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(142, 224, 116, 0.3)',
    gap: 3,
  },
  liveText: {
    color: colors.primaryBright,
    fontSize: 9,
    fontWeight: '700',
  },
});
