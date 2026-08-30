import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { colors, radii } from '../../theme/tokens';
import type { CustomWeights } from '../../services/api/types';

interface PreferenceSliderProps {
  weights: CustomWeights;
  onChange: (weights: CustomWeights) => void;
}

export const PreferenceSlider: React.FC<PreferenceSliderProps> = ({
  weights,
  onChange,
}) => {
  function adjust(key: keyof CustomWeights, delta: number) {
    const rawVal = Math.max(5, Math.min(90, weights[key] + delta));
    const others = (['time', 'cost', 'carbon'] as Array<keyof CustomWeights>).filter(
      (k) => k !== key
    );

    const remaining = 100 - rawVal;
    const currentOthersSum = weights[others[0]] + weights[others[1]];

    let newOther1 = Math.round((weights[others[0]] / (currentOthersSum || 1)) * remaining);
    let newOther2 = remaining - newOther1;

    if (newOther1 < 5) {
      newOther1 = 5;
      newOther2 = remaining - 5;
    } else if (newOther2 < 5) {
      newOther2 = 5;
      newOther1 = remaining - 5;
    }

    onChange({
      ...weights,
      [key]: rawVal,
      [others[0]]: newOther1,
      [others[1]]: newOther2,
    });
  }

  const items: Array<{ key: keyof CustomWeights; label: string; color: string }> = [
    { key: 'time', label: 'Speed (Time)', color: colors.sky },
    { key: 'cost', label: 'Cost (INR)', color: colors.amber },
    { key: 'carbon', label: 'Carbon (CO₂)', color: colors.primaryBright },
  ];

  return (
    <View style={styles.container}>
      {items.map(({ key, label, color }) => (
        <View key={key} style={styles.row}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{label}</Text>
            <Text style={[styles.value, { color }]}>{weights[key]}%</Text>
          </View>

          <View style={styles.barAndControls}>
            <TouchableOpacity
              onPress={() => adjust(key, -5)}
              style={styles.stepBtn}
              activeOpacity={0.7}
            >
              <Minus size={12} color={colors.textWhite} />
            </TouchableOpacity>

            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${weights[key]}%`, backgroundColor: color },
                ]}
              />
            </View>

            <TouchableOpacity
              onPress={() => adjust(key, 5)}
              style={styles.stepBtn}
              activeOpacity={0.7}
            >
              <Plus size={12} color={colors.textWhite} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  value: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  barAndControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
