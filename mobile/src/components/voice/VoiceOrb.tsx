import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Mic, MicOff } from 'lucide-react-native';
import { colors, radii } from '../../theme/tokens';

const ORB_SIZE = 84;

interface Props {
  isRecording: boolean;
  /** Live mic level 0..1. Drives the halo so the user can see their voice registering. */
  metering: number;
  disabled?: boolean;
  permissionDenied?: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}

/**
 * Hold-to-talk microphone button.
 *
 * Press-and-hold rather than tap-to-toggle: the user controls exactly when recording ends, so
 * there is no silence-detection heuristic to cut them off mid-sentence, and letting go is an
 * unambiguous "I'm done" that needs no second tap.
 */
export const VoiceOrb: React.FC<Props> = ({
  isRecording,
  metering,
  disabled,
  permissionDenied,
  onPressIn,
  onPressOut,
}) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const level = useRef(new Animated.Value(0)).current;

  // A slow breathing loop while idle, so the orb reads as an invitation rather than decoration.
  useEffect(() => {
    if (isRecording || disabled) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [disabled, isRecording, pulse]);

  // Track the real input level while recording. Short duration so the halo tracks speech
  // rhythm; without the tween it snaps between metering samples and reads as flicker.
  useEffect(() => {
    Animated.timing(level, {
      toValue: isRecording ? metering : 0,
      duration: 120,
      useNativeDriver: true,
    }).start();
  }, [isRecording, level, metering]);

  const haloScale = isRecording
    ? level.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.7] })
    : pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  const haloOpacity = isRecording
    ? level.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] })
    : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.08] });

  const handlePressIn = () => {
    if (disabled || permissionDenied) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPressIn();
  };

  const handlePressOut = () => {
    if (disabled || permissionDenied) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressOut();
  };

  const Icon = permissionDenied ? MicOff : Mic;

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { transform: [{ scale: haloScale }], opacity: haloOpacity }]}
      />
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || permissionDenied}
        // Hold-to-talk has no visible affordance for "keep holding", so the label carries it.
        accessibilityRole="button"
        accessibilityLabel="Hold to speak your destination"
        accessibilityState={{ disabled: disabled || permissionDenied, busy: isRecording }}
        style={({ pressed }) => [
          styles.orb,
          isRecording && styles.orbRecording,
          (disabled || permissionDenied) && styles.orbDisabled,
          pressed && styles.orbPressed,
        ]}
      >
        <Icon size={30} color={isRecording ? colors.bgDark : colors.textWhite} />
      </Pressable>
      <Text style={styles.hint}>
        {permissionDenied
          ? 'Microphone access is off'
          : isRecording
            ? 'Listening — release when done'
            : 'Hold to speak'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  halo: {
    position: 'absolute',
    top: 0,
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: radii.full,
    backgroundColor: colors.primaryBright,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderWidth: 2,
    borderColor: colors.primaryBright,
  },
  orbRecording: {
    backgroundColor: colors.primaryBright,
    borderColor: colors.textWhite,
  },
  orbPressed: {
    transform: [{ scale: 0.96 }],
  },
  orbDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: colors.borderSubtle,
  },
  hint: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
});
