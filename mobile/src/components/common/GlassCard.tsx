import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii } from '../../theme/tokens';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'light' | 'dark' | 'input' | 'accent';
}

// Real glassmorphism: BlurView actually samples and blurs whatever's behind the card (the
// ImageBackground/route map), which a translucent gradient alone can't do -- it can only fake
// frosting with color, not blur. The gradient stays on top as a tint/color layer.
const VARIANTS: Record<
  NonNullable<GlassCardProps['variant']>,
  { tint: 'light' | 'dark'; intensity: number; overlay: [string, string]; border: string }
> = {
  light: {
    tint: 'light',
    intensity: 30,
    overlay: ['rgba(255, 255, 255, 0.14)', 'rgba(255, 255, 255, 0.04)'],
    border: colors.borderLight,
  },
  dark: {
    tint: 'dark',
    intensity: 45,
    overlay: ['rgba(0, 0, 0, 0.55)', 'rgba(0, 0, 0, 0.3)'],
    border: colors.borderSubtle,
  },
  input: {
    tint: 'dark',
    intensity: 25,
    overlay: ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)'],
    border: colors.borderSubtle,
  },
  accent: {
    tint: 'light',
    intensity: 30,
    overlay: ['rgba(142, 224, 116, 0.2)', 'rgba(77, 124, 62, 0.12)'],
    border: 'rgba(142, 224, 116, 0.4)',
  },
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  variant = 'light',
}) => {
  const v = VARIANTS[variant];

  return (
    <View style={[styles.container, { borderColor: v.border }]}>
      <BlurView intensity={v.intensity} tint={v.tint} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={v.overlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, style]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  content: {
    padding: 16,
  },
});
