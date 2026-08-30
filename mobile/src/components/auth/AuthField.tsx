import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { light, radii } from '../../theme/tokens';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Adds a show/hide toggle and starts obscured. */
  secure?: boolean;
  /** Shown under the field once the user has had a chance to fill it in — see `touched`. */
  error?: string | null;
  /** Helper text shown when there is no error, e.g. a password rule stated up front. */
  hint?: string;
  trailing?: React.ReactNode;
}

export const AuthField: React.FC<Props> = ({
  label,
  secure,
  error,
  hint,
  trailing,
  ...inputProps
}) => {
  const [focused, setFocused] = useState(false);
  // Typing your password with no way to check it is the single most common reason a login
  // fails twice in a row, so every secure field here can be revealed.
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {trailing}
      </View>

      <View
        style={[
          styles.inputShell,
          focused && styles.inputShellFocused,
          Boolean(error) && styles.inputShellError,
        ]}
      >
        <TextInput
          {...inputProps}
          style={styles.input}
          placeholderTextColor={light.inkFaint}
          secureTextEntry={secure && !revealed}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
        />
        {secure ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            {revealed ? (
              <EyeOff size={16} color={light.inkSoft} />
            ) : (
              <Eye size={16} color={light.inkSoft} />
            )}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: light.inkFaint,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: light.hairline,
    borderRadius: radii.md,
    paddingHorizontal: 13,
  },
  inputShellFocused: {
    borderColor: light.moss,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  inputShellError: {
    borderColor: light.danger,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: light.ink,
  },
  error: {
    fontSize: 11,
    color: light.danger,
    lineHeight: 15,
  },
  hint: {
    fontSize: 11,
    color: light.inkFaint,
    lineHeight: 15,
  },
});
