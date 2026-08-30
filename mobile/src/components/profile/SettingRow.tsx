import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { light, radii } from '../../theme/tokens';

interface Props {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
  isLast?: boolean;
}

const TRACK_WIDTH = 42;
const KNOB_SIZE = 19;
const TRAVEL = TRACK_WIDTH - KNOB_SIZE - 5;

export const SettingRow: React.FC<Props> = ({ label, description, value, onChange, isLast }) => {
  const position = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    // Animated rather than a jump: the knob moving is what confirms the tap registered, on a
    // control whose two states otherwise differ only by colour.
    Animated.timing(position, {
      toValue: value ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [position, value]);

  return (
    <Pressable
      style={[styles.row, isLast && styles.rowLast]}
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={description}
    >
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={[styles.track, value && styles.trackOn]}>
        <Animated.View
          style={[
            styles.knob,
            { transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, TRAVEL] }) }] },
          ]}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: light.hairline,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  body: {
    flex: 1,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: light.ink,
  },
  description: {
    fontSize: 11,
    color: light.inkSoft,
    marginTop: 2,
    lineHeight: 15,
  },
  track: {
    width: TRACK_WIDTH,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: 'rgba(32, 42, 34, 0.14)',
    padding: 2.5,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: light.moss,
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: radii.full,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
});
