import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { light, radii } from '../theme/tokens';
import { AuthShell } from '../components/auth/AuthShell';
import { AuthField } from '../components/auth/AuthField';
import { useAuth } from '../lib/authContext';
import {
  MIN_PASSWORD_LENGTH,
  checkPassword,
  isValidEmail,
  passwordStrength,
} from '../lib/validation';

const STRENGTH_LABELS = ['Too short', 'Okay', 'Good', 'Strong'] as const;

export const SignUpScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { register, busy, error, clearError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ name: false, email: false, password: false });

  useEffect(() => {
    clearError();
  }, [clearError, name, email, password]);

  const passwordCheck = checkPassword(password);
  const strength = passwordStrength(password);

  const nameError = touched.name && !name.trim() ? 'Enter your name.' : null;
  const emailError = touched.email && !isValidEmail(email) ? 'Enter a valid email address.' : null;
  const passwordError = touched.password ? passwordCheck.message : null;

  const canSubmit = Boolean(name.trim()) && isValidEmail(email) && passwordCheck.valid;

  async function handleSignUp() {
    if (!canSubmit) return;
    // Registration signs you straight in, so there is no second step between here and the app.
    const ok = await register(name.trim(), email.trim(), password);
    if (ok) navigation.goBack();
  }

  return (
    <AuthShell
      heading="Create your account"
      sub="Your priorities start getting remembered from your very first trip."
      error={error}
      submitLabel="Create account"
      submitEnabled={canSubmit}
      busy={busy}
      onSubmit={handleSignUp}
      footer={
        <>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => navigation.replace('Login')} accessibilityRole="button">
            <Text style={styles.footerLink}>Log in</Text>
          </Pressable>
        </>
      }
    >
      <AuthField
        label="Full name"
        value={name}
        onChangeText={setName}
        onBlur={() => setTouched((t) => ({ ...t, name: true }))}
        error={nameError}
        placeholder="Your name"
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
      />

      <AuthField
        label="Email"
        value={email}
        onChangeText={setEmail}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        error={emailError}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
      />

      <View style={styles.passwordBlock}>
        <AuthField
          label="Password"
          value={password}
          onChangeText={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={passwordError}
          // Stating the rule up front beats revealing it as an error after they have committed
          // to a password and had it rejected.
          hint={password ? undefined : `At least ${MIN_PASSWORD_LENGTH} characters.`}
          placeholder="Choose a password"
          secure
          autoComplete="new-password"
          returnKeyType="go"
          onSubmitEditing={handleSignUp}
        />

        {password && !passwordError ? (
          <View style={styles.strengthRow}>
            <View style={styles.strengthTrack}>
              {[1, 2, 3].map((step) => (
                <View
                  key={step}
                  style={[styles.strengthSegment, step <= strength && styles.strengthSegmentOn]}
                />
              ))}
            </View>
            <Text style={styles.strengthLabel}>{STRENGTH_LABELS[strength]}</Text>
          </View>
        ) : null}
      </View>
    </AuthShell>
  );
};

const styles = StyleSheet.create({
  passwordBlock: {
    gap: 8,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  strengthTrack: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 3,
    borderRadius: radii.full,
    backgroundColor: light.hairline,
  },
  strengthSegmentOn: {
    backgroundColor: light.moss,
  },
  strengthLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: light.inkSoft,
    width: 56,
    textAlign: 'right',
  },
  footerText: {
    fontSize: 12,
    color: light.inkSoft,
  },
  footerLink: {
    fontSize: 12,
    fontWeight: '700',
    color: light.mossDeep,
  },
});
