import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { MapPin, Navigation } from 'lucide-react-native';
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

export const RouteMap: React.FC<RouteMapProps> = ({
  routes = [],
  selectedMode = 'car',
  originLabel = 'Gandhipuram',
  destinationLabel = 'RS Puram',
}) => {
  const screenWidth = Dimensions.get('window').width - 32; // padding margin
  const width = Math.max(300, screenWidth);
  const height = 220;

  // Extract all coordinates from GeoJSON LineStrings to compute bounds
  const { paths, originPoint, destPoint } = useMemo(() => {
    let allCoords: Array<[number, number]> = [];

    routes.forEach((r) => {
      if (r.geometry && r.geometry.type === 'LineString' && Array.isArray(r.geometry.coordinates)) {
        r.geometry.coordinates.forEach((c: any) => {
          if (Array.isArray(c) && c.length >= 2) {
            allCoords.push([c[0], c[1]]);
          }
        });
      }
    });

    // Default Coimbatore OD if no coords
    if (allCoords.length === 0) {
      allCoords = [
        [76.9605, 10.9955],
        [76.9650, 11.0010],
        [76.9700, 11.0040],
        [76.9735, 11.0070],
      ];
    }

    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    allCoords.forEach(([lon, lat]) => {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    // Add padding margin to map bounds
    const lonPadding = (maxLon - minLon || 0.01) * 0.18;
    const latPadding = (maxLat - minLat || 0.01) * 0.18;
    minLon -= lonPadding;
    maxLon += lonPadding;
    minLat -= latPadding;
    maxLat += latPadding;

    const lonSpan = maxLon - minLon || 0.01;
    const latSpan = maxLat - minLat || 0.01;

    const project = (lon: number, lat: number) => {
      const x = ((lon - minLon) / lonSpan) * (width - 40) + 20;
      // Invert Y for screen coordinates
      const y = height - (((lat - minLat) / latSpan) * (height - 40) + 20);
      return { x, y };
    };

    const renderedPaths = routes.map((r, idx) => {
      const coords = r.geometry?.coordinates || [];
      if (!Array.isArray(coords) || coords.length === 0) return null;

      let d = '';
      coords.forEach((coord: any, i: number) => {
        if (Array.isArray(coord) && coord.length >= 2) {
          const pt = project(coord[0], coord[1]);
          if (i === 0) {
            d += `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
          } else {
            d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
          }
        }
      });

      let stroke = 'rgba(255, 255, 255, 0.35)';
      let strokeWidth = 3;
      let strokeDasharray: string | undefined = undefined;

      if (r.role === 'primary') {
        stroke = colors.primaryBright;
        strokeWidth = 5;
      } else if (r.role === 'ghost') {
        stroke = '#ef4444';
        strokeWidth = 3;
        strokeDasharray = '6,4';
      } else if (r.mode === 'two_wheeler') {
        stroke = colors.amber;
      } else if (r.mode === 'cycling') {
        stroke = colors.sky;
      }

      return {
        key: `${r.mode}-${idx}`,
        d,
        stroke,
        strokeWidth,
        strokeDasharray,
        role: r.role,
      };
    }).filter(Boolean);

    const firstCoord = allCoords[0];
    const lastCoord = allCoords[allCoords.length - 1];

    const originPt = firstCoord ? project(firstCoord[0], firstCoord[1]) : { x: 30, y: height - 30 };
    const destPt = lastCoord ? project(lastCoord[0], lastCoord[1]) : { x: width - 30, y: 30 };

    return {
      paths: renderedPaths,
      originPoint: originPt,
      destPoint: destPt,
    };
  }, [routes, width, height]);

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Background grid lines for map feel */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="mapBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#14241B" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#0B140F" stopOpacity="0.95" />
          </LinearGradient>
        </Defs>

        {/* Map Canvas Background */}
        <Path
          d={`M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`}
          fill="url(#mapBg)"
        />

        {/* Decorative Grid Lines */}
        <Path
          d={`M 0 ${height * 0.33} L ${width} ${height * 0.33} M 0 ${height * 0.66} L ${width} ${height * 0.66}`}
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="1"
        />
        <Path
          d={`M ${width * 0.33} 0 L ${width * 0.33} ${height} M ${width * 0.66} 0 L ${width * 0.66} ${height}`}
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="1"
        />

        {/* Route Paths */}
        {paths.map((p) => (
          <Path
            key={p?.key}
            d={p?.d}
            stroke={p?.stroke}
            strokeWidth={p?.strokeWidth}
            strokeDasharray={p?.strokeDasharray}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}

        {/* Origin Pin Circle */}
        <Circle
          cx={originPoint.x}
          cy={originPoint.y}
          r={7}
          fill={colors.textWhite}
          stroke="rgba(0,0,0,0.5)"
          strokeWidth={2}
        />

        {/* Destination Pin Circle */}
        <Circle
          cx={destPoint.x}
          cy={destPoint.y}
          r={8}
          fill={colors.primaryBright}
          stroke="rgba(0,0,0,0.6)"
          strokeWidth={2}
        />
      </Svg>

      {/* Floating Map Labels */}
      <View style={styles.topInfoBar}>
        <View style={styles.badgeRow}>
          <View style={styles.pinDot} />
          <Text style={styles.badgeText} numberOfLines={1}>
            {originLabel} → {destinationLabel}
          </Text>
        </View>
        <View style={styles.liveIndicator}>
          <Navigation size={10} color={colors.primaryBright} />
          <Text style={styles.liveText}>OSRM Live</Text>
        </View>
      </View>

      {/* Legend at bottom */}
      <View style={styles.legendBar}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.primaryBright }]} />
          <Text style={styles.legendText}>Active</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.amber }]} />
          <Text style={styles.legendText}>Two-Wheeler</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.sky }]} />
          <Text style={styles.legendText}>Cycling</Text>
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
  legendBar: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.md,
    alignSelf: 'flex-start',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.textSubtle,
    fontSize: 9,
    fontWeight: '600',
  },
});
