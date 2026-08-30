import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Crosshair, MapPin, TriangleAlert } from 'lucide-react-native';
import { colors, radii } from '../../theme/tokens';
import type { LocationPoint } from '../../lib/mockLocations';

interface Props {
  origin: LocationPoint | null;
  loading: boolean;
  denied: boolean;
  onPress: () => void;
}

/**
 * The trip's starting point, shown above the mic.
 *
 * Its job is to answer "where does it think I am?" before the user commits to speaking. Voice
 * planning only names a destination -- the origin comes from GPS silently -- so without this the
 * first sign of a wrong starting point would be a wrong route, after the whole pipeline has run.
 */
export const OriginChip: React.FC<Props> = ({ origin, loading, denied, onPress }) => {
  const state = denied ? 'denied' : loading && !origin ? 'locating' : origin ? 'ready' : 'unknown';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      accessibilityRole="button"
      accessibilityLabel={
        state === 'ready' ? `Starting from ${origin!.label}. Tap to change.` : 'Set your starting point'
      }
    >
      <View style={styles.iconSlot}>
        {state === 'locating' ? (
          <ActivityIndicator size="small" color={colors.primaryBright} />
        ) : state === 'ready' ? (
          <MapPin size={13} color={colors.primaryBright} />
        ) : (
          <TriangleAlert size={13} color={colors.amber} />
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.caption}>FROM</Text>
        <Text
          style={[styles.label, state !== 'ready' && styles.labelMuted]}
          numberOfLines={1}
        >
          {state === 'locating'
            ? 'Finding your location…'
            : state === 'denied'
              ? 'Location off — tap to pick a start'
              : state === 'unknown'
                ? 'Tap to set your starting point'
                : origin!.label}
        </Text>
      </View>

      <Crosshair size={14} color={colors.textDim} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.full,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 9,
  },
  chipPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  iconSlot: {
    width: 16,
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
  caption: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textDim,
    letterSpacing: 0.7,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textWhite,
    marginTop: 1,
  },
  labelMuted: {
    color: colors.textMuted,
    fontWeight: '500',
  },
});
