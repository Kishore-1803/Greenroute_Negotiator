import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AlertTriangle, ArrowLeft, Leaf } from 'lucide-react-native';
import { light, radii } from '../../theme/tokens';
import { LightBackground } from '../common/LightBackground';
import { LightCard } from '../common/LightCard';

interface Props {
  heading: string;
  sub: string;
  /** Server-side failure (bad credentials, email taken, backend unreachable). */
  error?: string | null;
  children: React.ReactNode;
  submitLabel: string;
  submitEnabled: boolean;
  busy: boolean;
  onSubmit: () => void;
  footer: React.ReactNode;
}

/**
 * Shared frame for Login and Sign Up: back affordance, branded header, error banner, primary
 * action, footer link. Both screens differ only in their fields, so the chrome lives here rather
 * than being maintained twice and drifting.
 */
export const AuthShell: React.FC<Props> = ({
  heading,
  sub,
  error,
  children,
  submitLabel,
  submitEnabled,
  busy,
  onSubmit,
  footer,
}) => {
  const navigation = useNavigation<any>();
  const canSubmit = submitEnabled && !busy;

  return (
    <LightBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.backRow}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={16} color={light.inkSoft} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LightCard style={styles.card}>
            <View style={styles.mark}>
              <Leaf size={18} color={light.mossDeep} />
            </View>
            <Text style={styles.heading}>{heading}</Text>
            <Text style={styles.sub}>{sub}</Text>

            {error ? (
              <View style={styles.errorBanner}>
                <AlertTriangle size={14} color={light.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fields}>{children}</View>

            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit, busy }}
              style={({ pressed }) => [
                styles.cta,
                !canSubmit && styles.ctaDisabled,
                pressed && canSubmit && styles.ctaPressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#F3F7F1" />
              ) : (
                <Text style={styles.ctaText}>{submitLabel}</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>{footer}</View>
          </LightCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </LightBackground>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: light.inkSoft,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    padding: 22,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: light.mossPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heading: {
    fontSize: 23,
    fontWeight: '700',
    color: light.ink,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 12.5,
    color: light.inkSoft,
    marginTop: 5,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(138, 90, 74, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(138, 90, 74, 0.3)',
    borderRadius: radii.md,
    padding: 11,
    marginTop: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: light.danger,
    lineHeight: 16,
  },
  fields: {
    gap: 14,
    marginTop: 20,
    marginBottom: 20,
  },
  cta: {
    backgroundColor: light.mossDeep,
    borderRadius: radii.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    shadowColor: light.mossDeep,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 4,
  },
  ctaDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    color: '#F3F7F1',
    fontSize: 14,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
});
