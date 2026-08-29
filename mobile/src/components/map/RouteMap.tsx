import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { Navigation } from 'lucide-react-native';
import { colors, radii } from '../../theme/tokens';
import type { TravelMode } from '../../types/mode';
import type { GeoJsonGeometry } from '../../services/api/types';

export interface RouteGeometryInput {
  mode: string;
  geometry: GeoJsonGeometry;
  role: 'primary' | 'secondary' | 'ghost';
}

interface RouteMapProps {
  routes?: RouteGeometryInput[];
  selectedMode?: TravelMode;
  originLabel?: string;
  destinationLabel?: string;
}

function colorFor(r: RouteGeometryInput): string {
  if (r.role === 'primary') return colors.primaryBright;
  if (r.role === 'ghost') return '#ef4444';
  if (r.mode === 'two_wheeler') return colors.amber;
  if (r.mode === 'cycling') return colors.sky;
  return 'rgba(255,255,255,0.45)';
}

// A real OpenStreetMap/Leaflet basemap rendered inside a WebView -- Leaflet + tiles are
// Expo-Go-compatible (no native map SDK / API key needed), unlike react-native-maps.
function buildMapHtml(routes: RouteGeometryInput[]): string {
  const lines = routes
    .filter((r) => r.geometry?.type === 'LineString' && Array.isArray(r.geometry.coordinates) && r.geometry.coordinates.length > 1)
    .map((r) => ({
      latlngs: r.geometry.coordinates.map((c: any) => [c[1], c[0]]),
      color: colorFor(r),
      weight: r.role === 'primary' ? 5 : 3,
      dashArray: r.role === 'ghost' ? '6,6' : undefined,
      opacity: r.role === 'secondary' ? 0.55 : 0.95,
    }));

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #0B140F; }
    .leaflet-control-attribution { font-size: 8px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const lines = ${JSON.stringify(lines)};
    const bounds = [];
    lines.forEach((line) => {
      L.polyline(line.latlngs, {
        color: line.color,
        weight: line.weight,
        opacity: line.opacity,
        dashArray: line.dashArray,
        lineCap: 'round',
      }).addTo(map);
      line.latlngs.forEach((p) => bounds.push(p));
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [28, 28] });
      const origin = lines[0]?.latlngs[0];
      const dest = lines[0]?.latlngs[lines[0].latlngs.length - 1];
      if (origin) L.circleMarker(origin, { radius: 7, color: '#000', weight: 2, fillColor: '#fff', fillOpacity: 1 }).addTo(map);
      if (dest) L.circleMarker(dest, { radius: 8, color: '#000', weight: 2, fillColor: '#8EE074', fillOpacity: 1 }).addTo(map);
    } else {
      map.setView([10.9955, 76.9605], 14);
    }
  </script>
</body>
</html>`;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  routes = [],
  originLabel = 'Gandhipuram',
  destinationLabel = 'RS Puram',
}) => {
  const screenWidth = Dimensions.get('window').width - 32;
  const width = Math.max(300, screenWidth);
  const height = 220;

  const html = useMemo(() => buildMapHtml(routes), [routes]);
  const hasRoutes = routes.some((r) => r.geometry?.coordinates?.length > 1);

  return (
    <View style={[styles.container, { width, height }]}>
      {hasRoutes ? (
        <WebView
          key={html.length /* cheap change-detector to force reload on new geometry */}
          source={{ html }}
          style={StyleSheet.absoluteFill}
          scrollEnabled={false}
          originWhitelist={['*']}
          javaScriptEnabled
        />
      ) : (
        <View style={[styles.placeholder, StyleSheet.absoluteFill]}>
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
