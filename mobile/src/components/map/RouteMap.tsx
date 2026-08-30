import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE, type LatLng } from 'react-native-maps';
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

interface DrawableRoute {
  mode: string;
  role: 'primary' | 'secondary' | 'ghost';
  coordinates: LatLng[];
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
      const coordinates = (r.geometry.coordinates as any[])
        .filter((c) => Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
        .map((c) => ({ latitude: c[1], longitude: c[0] }) as LatLng);
      if (coordinates.length < 2) return null;
      return { mode: r.mode, role: r.role, coordinates };
    })
    .filter((r): r is DrawableRoute => r !== null);
}

const DEFAULT_REGION = {
  latitude: 10.9955,
  longitude: 76.9605,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const RouteMap: React.FC<RouteMapProps> = ({
  routes = [],
  originLabel = 'Gandhipuram',
  destinationLabel = 'RS Puram',
}) => {
  const screenWidth = Dimensions.get('window').width - 32;
  const width = Math.max(300, screenWidth);
  const height = 220;

  const mapRef = useRef<MapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const normalizedRoutes = useMemo(() => normalizeRoutes(routes), [routes]);

  // Origin/destination pins follow the primary route specifically (falling back to whichever
  // route came first if none is marked primary) -- keeps the pins meaningful when a
  // ghost/secondary route is present too.
  const primaryRoute = normalizedRoutes.find((r) => r.role === 'primary') || normalizedRoutes[0];

  // Frame the primary (recommended) route specifically so the map focuses on the user's main
  // choice, not an average of every mode/ghost overlay on screen. Falls back to the union of
  // everything only if no route is marked primary.
  useEffect(() => {
    if (!isMapReady || !mapRef.current || normalizedRoutes.length === 0) return;
    const coordsToFit = primaryRoute ? primaryRoute.coordinates : normalizedRoutes.flatMap((r) => r.coordinates);
    if (coordsToFit.length < 2) return;
    mapRef.current.fitToCoordinates(coordsToFit, {
      edgePadding: { top: 28, right: 28, bottom: 28, left: 28 },
      animated: true,
    });
  }, [normalizedRoutes, isMapReady, primaryRoute]);

  const showStatus = !isMapReady || normalizedRoutes.length === 0;

  return (
    <View style={[styles.container, { width, height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_REGION}
        onMapReady={() => setIsMapReady(true)}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {normalizedRoutes.map((r, idx) => (
          <Polyline
            key={`${r.mode}-${r.role}-${idx}`}
            coordinates={r.coordinates}
            strokeColor={colorFor(r)}
            strokeWidth={r.role === 'primary' ? 5 : 3}
            lineDashPattern={r.role === 'ghost' ? [6, 6] : undefined}
            zIndex={r.role === 'primary' ? 2 : 1}
          />
        ))}

        {primaryRoute && (
          <>
            <Marker coordinate={primaryRoute.coordinates[0]} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.originDot} />
            </Marker>
            <Marker
              coordinate={primaryRoute.coordinates[primaryRoute.coordinates.length - 1]}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.destDot} />
            </Marker>
          </>
        )}
      </MapView>

      {showStatus && (
        <View style={[styles.placeholder, StyleSheet.absoluteFill]} pointerEvents="none">
          <Text style={styles.placeholderText}>
            {isMapReady ? 'Fetching route…' : 'Loading map…'}
          </Text>
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
          <Text style={styles.liveText}>Live Route</Text>
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
  originDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
  },
  destDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primaryBright,
    borderWidth: 2,
    borderColor: '#000',
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
