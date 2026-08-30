import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { light } from '../theme/tokens';
import { AuthShell } from '../components/auth/AuthShell';
import { AuthField } from '../components/auth/AuthField';
import { useAuth } from '../lib/authContext';
import { isValidEmail } from '../lib/validation';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { login, busy, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Errors appear on blur, not on every keystroke: telling someone their email is invalid while
  // they are still on the third character is noise, not help.
  const [touched, setTouched] = useState({ email: false, password: false });

  // A stale "that email or password is incorrect" sitting above the form while the user edits
  // it reads as though the new input has already failed.
  useEffect(() => {
    clearError();
  }, [clearError, email, password]);

  const emailError = touched.email && !isValidEmail(email) ? 'Enter a valid email address.' : null;
  const passwordError = touched.password && !password ? 'Enter your password.' : null;
  const canSubmit = isValidEmail(email) && password.length > 0;

  async function handleLogin() {
    if (!canSubmit) return;
    const ok = await login(email.trim(), password);
    if (ok) {
      // popTo rather than navigate: Login is presented as a modal over the tabs, so this
      // dismisses it back to where the user was instead of stacking another Tabs screen.
      navigation.goBack();
    }
  }

  return (
    <AuthShell
      heading="Welcome back"
      sub="Log in to pick up your routes and the priorities GreenRoute has learned for you."
      error={error}
      submitLabel="Log in"
      submitEnabled={canSubmit}
      busy={busy}
      onSubmit={handleLogin}
      footer={
        <>
          <Text style={styles.footerText}>New to GreenRoute? </Text>
          <Pressable onPress={() => navigation.replace('SignUp')} accessibilityRole="button">
            <Text style={styles.footerLink}>Create an account</Text>
          </Pressable>
        </>
      }
    >
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

      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
        error={passwordError}
        placeholder="Your password"
        secure
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />
    </AuthShell>
  );
};

const styles = StyleSheet.create({
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
