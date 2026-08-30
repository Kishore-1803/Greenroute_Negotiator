import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { light, radii } from '../../theme/tokens';

interface LightCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// GlassCard's light-on-dark counterpart: same real-blur construction, tuned for a pale backdrop
// (LightBackground) instead of a photo -- a strong white frost plus a soft border instead of
// GlassCard's translucent-on-dark tint.
export const LightCard: React.FC<LightCardProps> = ({ children, style }) => {
  return (
    <View style={styles.container}>
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.tint} />
      <View style={[styles.content, style]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: light.glassBorder,
    overflow: 'hidden',
    shadowColor: light.mossDeep,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 6,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: light.glassFill,
  },
  content: {
    padding: 18,
  },
});
