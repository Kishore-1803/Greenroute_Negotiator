import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii } from '../../theme/tokens';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'light' | 'dark' | 'input' | 'accent';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  variant = 'light',
}) => {
  let gradientColors = ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.04)'];
  let borderColor = colors.borderLight;

  if (variant === 'dark') {
    gradientColors = ['rgba(0, 0, 0, 0.65)', 'rgba(0, 0, 0, 0.35)'];
    borderColor = colors.borderSubtle;
  } else if (variant === 'input') {
    gradientColors = ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)'];
    borderColor = colors.borderSubtle;
  } else if (variant === 'accent') {
    gradientColors = ['rgba(142, 224, 116, 0.18)', 'rgba(77, 124, 62, 0.1)'];
    borderColor = 'rgba(142, 224, 116, 0.4)';
  }

  return (
    <View style={[styles.container, { borderColor }, style]}>
      <LinearGradient
        colors={gradientColors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {children}
      </LinearGradient>
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
  gradient: {
    padding: 16,
  },
});
