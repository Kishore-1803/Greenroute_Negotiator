import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { light } from '../../theme/tokens';

interface LightBackgroundProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Soft sage/sand wash behind the light-glass screens (Login, Sign Up, Profile) -- gives
// LightCard's BlurView something to actually frost, the way GlassCard relies on the route map
// or hero photo on the dark screens.
export const LightBackground: React.FC<LightBackgroundProps> = ({ children, style }) => {
  return (
    <View style={[styles.fill, style]}>
      <LinearGradient
        colors={[light.sand, light.paper, light.mossPale]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
