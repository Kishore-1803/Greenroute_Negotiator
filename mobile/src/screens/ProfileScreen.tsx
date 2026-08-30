import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LogOut, Route, Sprout } from 'lucide-react-native';
import { light, radii } from '../theme/tokens';
import { LightBackground } from '../components/common/LightBackground';
import { LightCard } from '../components/common/LightCard';
import { WeightBar, type WeightSlice } from '../components/profile/WeightBar';
import { SettingRow } from '../components/profile/SettingRow';
import { useAuth } from '../lib/authContext';
import { useAppSettings } from '../lib/appSettings';
import type { LearnedPreferenceDTO } from '../services/api/types';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, preference, bootstrapping, logout, refresh } = useAuth();
  const { settings, update } = useAppSettings();
  const [refreshing, setRefreshing] = useState(false);

  // The weights move whenever a trip selection differs from the recommendation, which happens
  // on another tab. Re-reading on focus keeps this screen from showing a stale picture.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function confirmSignOut() {
    // Confirmed, not immediate: sign-out is one tap from a scrollable list, and recovering
    // means finding your password again.
    Alert.alert('Sign out?', "You'll need to log in again to see your learned preferences.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  if (bootstrapping) {
    return (
      <LightBackground style={styles.centerFill}>
        <ActivityIndicator color={light.moss} />
      </LightBackground>
    );
  }

  if (!user) return <SignedOutView onNavigate={(screen) => navigation.navigate(screen)} />;

  return (
    <LightBackground>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={light.moss} />
        }
      >
        <IdentityCard
          name={user.name}
          email={user.email}
          joined={user.created_at}
          tripCount={preference?.trip_count ?? null}
        />

        <LearnedWeightsCard preference={preference} />

        <LightCard>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.settingsList}>
            <SettingRow
              label="Speak recommendations"
              description="Read the result aloud after a voice-planned trip."
              value={settings.spokenRecommendations}
              onChange={(next) => update('spokenRecommendations', next)}
              isLast
            />
          </View>
        </LightCard>

        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutBtnPressed]}
          onPress={confirmSignOut}
          accessibilityRole="button"
        >
          <LogOut size={14} color={light.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </LightBackground>
  );
};

const IdentityCard: React.FC<{
  name: string;
  email: string;
  joined: string;
  tripCount: number | null;
}> = ({ name, email, joined, tripCount }) => (
  <LightCard style={styles.identityCard}>
    <View style={styles.identityRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsOf(name)}</Text>
      </View>
      <View style={styles.identityBody}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {email}
        </Text>
      </View>
    </View>

    <View style={styles.statsRow}>
      <View style={styles.stat}>
        <Route size={13} color={light.moss} />
        <Text style={styles.statValue}>{tripCount ?? '—'}</Text>
        <Text style={styles.statLabel}>
          {tripCount === 1 ? 'trip recorded' : 'trips recorded'}
        </Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.stat}>
        <Sprout size={13} color={light.moss} />
        <Text style={styles.statValue}>{formatJoinDate(joined)}</Text>
        <Text style={styles.statLabel}>member since</Text>
      </View>
    </View>
  </LightCard>
);

/**
 * Preference Memory's real weights — or an honest empty state.
 *
 * `has_learned` is false until a trip has actually been completed, and the numbers behind it are
 * the cold-start preset. Rendering those as "what we've learned about you" would be showing a
 * user a default and calling it their own behaviour, so this shows what will happen instead.
 */
const LearnedWeightsCard: React.FC<{ preference: LearnedPreferenceDTO | null }> = ({
  preference,
}) => {
  if (!preference) {
    return (
      <LightCard>
        <Text style={styles.sectionLabel}>WHAT MATTERS TO YOU</Text>
        <ActivityIndicator style={styles.cardLoader} color={light.moss} />
      </LightCard>
    );
  }

  if (!preference.has_learned) {
    return (
      <LightCard>
        <Text style={styles.sectionLabel}>WHAT MATTERS TO YOU</Text>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Sprout size={17} color={light.moss} />
          </View>
          <Text style={styles.emptyTitle}>Nothing learned yet</Text>
          <Text style={styles.emptyBody}>
            Take a trip and confirm which mode you actually used. When your choice differs from
            the recommendation, GreenRoute shifts how it weighs time, cost, and emissions for you.
          </Text>
        </View>
      </LightCard>
    );
  }

  const slices: WeightSlice[] = [
    { key: 'time', label: 'Speed', value: preference.w_time },
    { key: 'cost', label: 'Cost', value: preference.w_cost },
    { key: 'carbon', label: 'Carbon', value: preference.w_carbon },
  ];

  return (
    <LightCard>
      <View style={styles.cardHeader}>
        <Text style={styles.sectionLabel}>WHAT MATTERS TO YOU</Text>
        <View style={styles.badgeSoft}>
          <Text style={styles.badgeSoftText}>
            from {preference.trip_count} {preference.trip_count === 1 ? 'trip' : 'trips'}
          </Text>
        </View>
      </View>

      <Text style={styles.cardLede}>{describeLeaning(slices)}</Text>

      <View style={styles.chartBlock}>
        <WeightBar slices={slices} />
      </View>

      <Text style={styles.footnote}>
        Learned from the modes you actually picked — not from anything you told us.
      </Text>
    </LightCard>
  );
};

const SignedOutView: React.FC<{ onNavigate: (screen: string) => void }> = ({ onNavigate }) => (
  <LightBackground style={styles.centerFill}>
    <LightCard style={styles.loggedOutCard}>
      <View style={styles.mark}>
        <Sprout size={18} color={light.mossDeep} />
      </View>
      <Text style={styles.heading}>Your profile</Text>
      <Text style={styles.sub}>
        Log in to keep the priorities GreenRoute learns for you. You can plan trips without an
        account — they just won't follow you to another device.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        onPress={() => onNavigate('Login')}
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>Log in</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
        onPress={() => onNavigate('SignUp')}
        accessibilityRole="button"
      >
        <Text style={styles.ghostBtnText}>Create an account</Text>
      </Pressable>
    </LightCard>
  </LightBackground>
);

/** One plain-language sentence for the bar, so the card leads with meaning rather than numbers. */
function describeLeaning(slices: WeightSlice[]): string {
  const top = [...slices].sort((a, b) => b.value - a.value)[0];
  const spread = top.value - Math.min(...slices.map((s) => s.value));

  // Under ~8 points of spread the three are close enough that naming a "winner" would overstate
  // what a handful of trips actually shows.
  if (spread < 0.08) return 'You weigh time, cost, and emissions fairly evenly.';

  const phrase = { time: 'getting there quickly', cost: 'keeping costs down', carbon: 'lower emissions' };
  return `You lean toward ${phrase[top.key]}.`;
}

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

function formatJoinDate(iso: string): string {
  const date = new Date(iso);
  // A malformed timestamp should not render "Invalid Date" on the profile card.
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  centerFill: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loggedOutCard: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    padding: 22,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: light.mossPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: light.ink,
  },
  sub: {
    fontSize: 12.5,
    color: light.inkSoft,
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 20,
    lineHeight: 18,
  },
  cta: {
    width: '100%',
    backgroundColor: light.mossDeep,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaPressed: { opacity: 0.9 },
  ctaText: {
    color: '#F3F7F1',
    fontSize: 13.5,
    fontWeight: '700',
  },
  ghostBtn: {
    width: '100%',
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: light.hairline,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  ghostBtnPressed: { opacity: 0.85 },
  ghostBtnText: {
    color: light.mossDeep,
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: {
    padding: 16,
    gap: 13,
    paddingBottom: 40,
  },

  identityCard: {
    gap: 16,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: light.mossDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#F3F7F1',
    fontSize: 18,
    fontWeight: '700',
  },
  identityBody: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: light.ink,
    letterSpacing: -0.2,
  },
  email: {
    fontSize: 12,
    color: light.inkSoft,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: light.hairline,
    paddingTop: 14,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    width: 1,
    backgroundColor: light.hairline,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: light.ink,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    color: light.inkFaint,
    letterSpacing: 0.2,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: light.inkFaint,
  },
  cardLede: {
    fontSize: 14,
    fontWeight: '600',
    color: light.ink,
    marginTop: 11,
    lineHeight: 19,
  },
  chartBlock: {
    marginTop: 15,
  },
  cardLoader: {
    marginVertical: 22,
  },
  badgeSoft: {
    backgroundColor: light.mossPale,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  badgeSoftText: {
    fontSize: 10,
    fontWeight: '700',
    color: light.mossDeep,
  },
  footnote: {
    fontSize: 10.5,
    color: light.inkFaint,
    marginTop: 14,
    lineHeight: 14.5,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 7,
  },
  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: light.mossPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: light.ink,
  },
  emptyBody: {
    fontSize: 11.5,
    color: light.inkSoft,
    textAlign: 'center',
    lineHeight: 16.5,
  },

  settingsList: {
    marginTop: 6,
  },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: light.hairline,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  signOutBtnPressed: {
    backgroundColor: 'rgba(138, 90, 74, 0.08)',
  },
  signOutText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: light.danger,
  },
});
