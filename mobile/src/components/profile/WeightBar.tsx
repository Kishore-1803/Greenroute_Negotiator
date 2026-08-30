import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { dimensionColors, light, radii } from '../../theme/tokens';

export interface WeightSlice {
  key: 'time' | 'cost' | 'carbon';
  label: string;
  /** 0..1. The three slices are normalized server-side to sum to 1. */
  value: number;
}

interface Props {
  slices: WeightSlice[];
}

const BAR_HEIGHT = 12;
// Below this a segment is thinner than its own corner radius and renders as a sliver with no
// readable colour. It still gets a legend row with its real number -- the bar stops being the
// only place the value appears, rather than the value being dropped.
const MIN_VISIBLE_SHARE = 0.04;

/**
 * The learned weights as one stacked proportion bar.
 *
 * Deliberately not three separate progress bars. These three numbers are normalized to sum to
 * 1 -- they are shares of one budget, and raising one necessarily lowers the others. Three
 * independent tracks draw them as three unrelated scores, which is a different (and false)
 * claim about the data.
 */
export const WeightBar: React.FC<Props> = ({ slices }) => {
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <View style={styles.wrap}>
      <View
        style={styles.track}
        accessibilityRole="image"
        accessibilityLabel={slices
          .map((s) => `${s.label} ${Math.round((s.value / total) * 100)} percent`)
          .join(', ')}
      >
        {slices.map((slice, index) => {
          const share = slice.value / total;
          if (share < MIN_VISIBLE_SHARE) return null;
          return (
            <View
              key={slice.key}
              style={[
                styles.segment,
                {
                  flex: share,
                  backgroundColor: dimensionColors[slice.key],
                  // A surface-coloured gap between fills, so adjacent segments read as separate
                  // marks rather than one blended band -- this is what carries the boundary for
                  // a reader who cannot distinguish the two hues.
                  marginLeft: index === 0 ? 0 : 2,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Legend doubles as the direct labels. Identity is never carried by colour alone: every
          row pairs its swatch with the dimension's name and its own number. */}
      <View style={styles.legend}>
        {slices.map((slice) => (
          <View key={slice.key} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: dimensionColors[slice.key] }]} />
            <Text style={styles.legendLabel}>{slice.label}</Text>
            <Text style={styles.legendValue}>{Math.round((slice.value / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  track: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    borderRadius: radii.full,
    overflow: 'hidden',
    backgroundColor: light.hairline,
  },
  segment: {
    height: '100%',
  },
  legend: {
    gap: 7,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 9,
    height: 9,
    borderRadius: 2.5,
  },
  legendLabel: {
    flex: 1,
    // Text wears text tokens, never the series colour -- the swatch beside it carries identity.
    fontSize: 12.5,
    color: light.inkSoft,
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 12.5,
    color: light.ink,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
