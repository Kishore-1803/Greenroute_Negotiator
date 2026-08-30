import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  MapPin,
  Crosshair,
  ArrowRight,
  Zap,
  IndianRupee,
  Leaf,
  Car,
  SlidersHorizontal,
  AlertTriangle,
  Wifi,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  Scale,
  Clock,
  Fuel,
  Keyboard,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radii } from '../theme/tokens';
import { GlassCard } from '../components/common/GlassCard';
import { Button } from '../components/common/Button';
import { PreferenceSlider } from '../components/common/PreferenceSlider';
import { LocationPickerModal } from '../components/common/LocationPickerModal';
import { VoiceOrb } from '../components/voice/VoiceOrb';
import { VoiceFlowSheet } from '../components/voice/VoiceFlowSheet';
import { OriginChip } from '../components/voice/OriginChip';
import { MOCK_LOCATIONS, type LocationPoint } from '../lib/mockLocations';
import { FIXED_TRIP } from '../lib/fixedTrip';
import { useTripUserId } from '../lib/userId';
import { useAuth } from '../lib/authContext';
import { useCurrentLocation } from '../lib/useCurrentLocation';
import { useVoiceTripFlow } from '../lib/voice/useVoiceTripFlow';
import { tripsApi } from '../services/api/trips';
import { getBaseUrl, setCustomBaseUrl } from '../services/api/client';
import type { CustomWeights, StatedPriority } from '../services/api/types';

const PRIORITY_DETAILS: Record<
  StatedPriority,
  { label: string; icon: any }
> = {
  speed: { label: 'Speed', icon: Zap },
  cost: { label: 'Cost', icon: IndianRupee },
  carbon: { label: 'Carbon', icon: Leaf },
  balanced: { label: 'Balanced', icon: Car },
};

const DEFAULT_CUSTOM_WEIGHTS: CustomWeights = { time: 45, cost: 30, carbon: 25 };

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  // Both start empty. They used to default to two fixed Coimbatore landmarks, which meant a
  // user anywhere else saw a plausible-looking origin that was several hundred km from them --
  // and, because it looked filled in, had no reason to check it before routing.
  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  // The typed form is the fallback path; the mic above it is the primary one.
  const [showTypedPlanner, setShowTypedPlanner] = useState(false);
  const [priority, setPriority] = useState<StatedPriority>('balanced');
  const [useCustomWeights, setUseCustomWeights] = useState(false);
  const [customWeights, setCustomWeights] = useState<CustomWeights>(DEFAULT_CUSTOM_WEIGHTS);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Location picker (Nominatim search + Coimbatore suggestions) shared with Trip Workspace
  // via components/common/LocationPickerModal + lib/useLocationSearch.
  const [pickerType, setPickerType] = useState<'origin' | 'destination' | null>(null);

  function openPicker(type: 'origin' | 'destination') {
    setPickerType(type);
  }

  function closePicker() {
    setPickerType(null);
  }

  function selectLocation(loc: LocationPoint) {
    if (pickerType === 'origin') setOrigin(loc);
    if (pickerType === 'destination') setDestination(loc);
    closePicker();
  }

  // Backend connection override -- lets a physical device be pointed at the dev machine's
  // LAN IP when the automatic scriptURL-based detection (services/api/client.ts) guesses wrong.
  const [showConnSettings, setShowConnSettings] = useState(false);
  const [baseUrlInput, setBaseUrlInput] = useState(getBaseUrl());
  const [connStatus, setConnStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [connError, setConnError] = useState<string | null>(null);

  const userId = useTripUserId();
  const { user } = useAuth();

  // GPS drives two things: the origin a spoken trip starts from, and the region an ambiguous
  // spoken place name is resolved against ("anna nagar" exists in several cities).
  const deviceLocation = useCurrentLocation();

  // Adopt the GPS fix as the origin once it lands. Guarded on `origin` being unset so it only
  // ever fills an empty field -- a fix arriving late must not silently overwrite a starting
  // point the user deliberately picked while it was still resolving.
  useEffect(() => {
    if (deviceLocation.point && !origin) setOrigin(deviceLocation.point);
  }, [deviceLocation.point, origin]);

  // `origin`, not the raw GPS fix: it is normally the same point, but if location is denied (or
  // simply wrong) and the user picked a starting point by hand, that override is what the spoken
  // trip should start from. Passing the fix alone would fail with "I don't know where you are"
  // while the screen visibly shows an origin right above the mic.
  const voice = useVoiceTripFlow({ userId, deviceLocation: origin });
  const [voiceSheetOpen, setVoiceSheetOpen] = useState(false);

  const handleVoicePressIn = useCallback(() => {
    setVoiceSheetOpen(true);
    voice.beginListening();
  }, [voice]);

  const handleVoicePressOut = useCallback(async () => {
    const result = await voice.finishAndRun();
    if (!result) return;

    // The sheet closes on success so the Trip Workspace is what the user sees while the
    // recommendation is still being read out -- the numbers being spoken are on screen.
    setVoiceSheetOpen(false);
    setOrigin(result.origin);
    setDestination(result.destination);
    navigation.navigate('TripWorkspace', {
      baseline: result.baseline,
      origin: result.origin,
      destination: result.destination,
    });
  }, [navigation, voice]);

  function closeVoiceSheet() {
    setVoiceSheetOpen(false);
    voice.cancel();
  }

  async function handleTestConnection() {
    const candidate = baseUrlInput.trim().replace(/\/+$/, '');
    if (!candidate) return;
    setConnStatus('testing');
    setConnError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(`${candidate}/api/v1/health`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCustomBaseUrl(candidate);
      setConnStatus('ok');
    } catch (err: any) {
      setConnStatus('fail');
      setConnError(err?.name === 'AbortError' ? 'Timed out after 6s.' : err?.message || 'Unreachable.');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function handleLocate() {
    // A real fix, not the hardcoded Coimbatore placeholder this used to set: a spoken trip
    // starts from wherever the user actually is, and the typed planner should agree with it.
    const fix = await deviceLocation.refresh();
    if (fix) {
      setOrigin(fix);
      return;
    }
    setErrorMsg(
      deviceLocation.denied
        ? 'Location access is off. Turn it on in Settings, or pick a starting point manually.'
        : deviceLocation.error || 'Could not get your location.'
    );
  }

  async function handleFindRoute() {
    // userId is null only for the moment device storage takes to resolve. Waiting beats sending
    // a placeholder: a trip attributed to the wrong id trains the wrong preferences, and there
    // is no way to tell afterwards that it happened.
    if (!origin || !destination || !userId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await tripsApi.baseline({
        origin_lon: origin.lon,
        origin_lat: origin.lat,
        dest_lon: destination.lon,
        dest_lat: destination.lat,
        user_id: userId,
        ...(useCustomWeights ? { custom_weights: customWeights } : { stated_priority: priority }),
      });

      navigation.navigate('TripWorkspace', {
        baseline: data,
        origin,
        destination,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not compute route from backend.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLaunchDemoRoute() {
    if (!userId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const demoOrigin = MOCK_LOCATIONS[0];
      const demoDest = MOCK_LOCATIONS[1];
      const data = await tripsApi.baseline({
        origin_lon: FIXED_TRIP.originLon,
        origin_lat: FIXED_TRIP.originLat,
        dest_lon: FIXED_TRIP.destLon,
        dest_lat: FIXED_TRIP.destLat,
        current_mode: 'car',
        user_id: userId,
      });

      navigation.navigate('TripWorkspace', {
        baseline: data,
        origin: demoOrigin,
        destination: demoDest,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not launch demo route.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImageBackground
      source={require('../../assets/home.png')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.darkOverlay}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome + voice-first entry point. The spoken flow is the headline action here and
              the typed planner below is the fallback, not the other way round -- someone about
              to travel is usually holding the phone one-handed. */}
          <View style={styles.heroSection}>
            <Text style={styles.heroGreeting}>{greeting(user?.name)}</Text>
            <Text style={styles.heroTitle}>
              Where do you <Text style={styles.heroAccent}>want to go?</Text>
            </Text>
          </View>

          {/* The hero. Origin sits above the mic rather than below it because voice only names
              a destination -- the starting point is taken from GPS without being spoken, so the
              user needs to see it is right BEFORE they talk, not after a wrong route comes back. */}
          <GlassCard style={styles.voiceCard} variant="accent">
            <OriginChip
              origin={origin}
              loading={deviceLocation.loading}
              denied={deviceLocation.denied}
              onPress={() => openPicker('origin')}
            />

            <VoiceOrb
              isRecording={voice.isRecording}
              metering={voice.metering}
              permissionDenied={voice.permissionDenied}
              onPressIn={handleVoicePressIn}
              onPressOut={handleVoicePressOut}
            />

            {voice.permissionDenied ? (
              <Text style={styles.voiceDenied}>
                Microphone access is off, so voice planning is unavailable. Enable it in Settings,
                or type your route below.
              </Text>
            ) : (
              <Text style={styles.voiceExample}>
                Try <Text style={styles.voiceQuote}>“Take me to Anna Nagar”</Text> — I'll find it,
                compare your options, and tell you the best way to get there.
              </Text>
            )}
          </GlassCard>

          {/* Typed planning is the fallback path, so it stays folded away. Someone about to
              travel is usually one-handed; making them scroll past a full form to reach the mic
              would invert which of the two this screen is actually for. */}
          <TouchableOpacity
            style={styles.plannerToggle}
            activeOpacity={0.75}
            onPress={() => setShowTypedPlanner((v) => !v)}
          >
            <Keyboard size={13} color={colors.textMuted} />
            <Text style={styles.plannerToggleText}>
              {showTypedPlanner ? 'Hide typed planner' : 'Or type it instead'}
            </Text>
            {showTypedPlanner ? (
              <ChevronUp size={14} color={colors.textMuted} />
            ) : (
              <ChevronDown size={14} color={colors.textMuted} />
            )}
          </TouchableOpacity>

          {showTypedPlanner && (
          <GlassCard style={styles.plannerCard} variant="light">
            <Text style={styles.plannerHeading}>Plan Your Route</Text>

            {/* Origin Input */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openPicker('origin')}
              style={styles.inputBox}
            >
              <View style={styles.inputLeft}>
                <MapPin size={16} color={colors.textMuted} />
                <Text
                  style={[
                    styles.inputText,
                    !origin && { color: colors.textDim },
                  ]}
                  numberOfLines={1}
                >
                  {origin ? origin.label : 'Current Location'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleLocate}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Crosshair size={16} color={colors.primaryBright} />
              </TouchableOpacity>
            </TouchableOpacity>

            {/* Destination Input */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openPicker('destination')}
              style={styles.inputBox}
            >
              <View style={styles.inputLeft}>
                <MapPin size={16} color={colors.primaryBright} />
                <Text
                  style={[
                    styles.inputText,
                    !destination && { color: colors.textDim },
                  ]}
                  numberOfLines={1}
                >
                  {destination ? destination.label : 'Destination'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Preference Priority / Custom Weights Toggle */}
            <View style={styles.preferenceSection}>
              <View style={styles.prefHeader}>
                <Text style={styles.prefTitle}>WHAT MATTERS MOST TO YOU?</Text>
                <TouchableOpacity
                  onPress={() => setUseCustomWeights(!useCustomWeights)}
                  style={styles.toggleBtn}
                >
                  <SlidersHorizontal size={12} color={colors.primaryBright} />
                  <Text style={styles.toggleText}>
                    {useCustomWeights ? 'Presets' : 'Custom'}
                  </Text>
                </TouchableOpacity>
              </View>

              {useCustomWeights ? (
                <View style={styles.customWeightsBox}>
                  <PreferenceSlider
                    weights={customWeights}
                    onChange={setCustomWeights}
                  />
                </View>
              ) : (
                <View style={styles.priorityGrid}>
                  {(Object.keys(PRIORITY_DETAILS) as StatedPriority[]).map((p) => {
                    const item = PRIORITY_DETAILS[p];
                    const Icon = item.icon;
                    const isSelected = priority === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setPriority(p)}
                        style={[
                          styles.priorityChip,
                          isSelected && styles.priorityChipActive,
                        ]}
                      >
                        <Icon
                          size={14}
                          color={isSelected ? colors.primaryBright : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.priorityText,
                            isSelected && styles.priorityTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Submit Button */}
            <Button
              title={loading ? 'Finding Optimal Route…' : 'Find Best Route'}
              onPress={handleFindRoute}
              loading={loading}
              variant="forest"
              icon={<ArrowRight size={16} color={colors.textWhite} />}
              style={styles.submitBtn}
            />
          </GlassCard>
          )}

          {/* Outside the collapsed planner: a failure from the typed flow would otherwise be
              hidden along with it, and a voice-flow failure has no planner to live in at all. */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <AlertTriangle size={14} color={colors.red} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Capability Chips -- factual system capabilities (matches the web frontend's
              Home page exactly: features/trip runs all four on every trip, these aren't
              fabricated usage stats). */}
          <GlassCard style={styles.capCard} variant="dark">
            <View style={styles.capGrid}>
              <View style={styles.capItem}>
                <Car size={14} color={colors.primaryBright} />
                <Text style={styles.capNum}>3</Text>
                <Text style={styles.capLabel}>Modes{'\n'}Compared</Text>
              </View>
              <View style={styles.capItem}>
                <MessageSquareText size={14} color={colors.primaryBright} />
                <Text style={styles.capNum}>3</Text>
                <Text style={styles.capLabel}>Decision{'\n'}Agents</Text>
              </View>
              <View style={styles.capItem}>
                <Scale size={14} color={colors.primaryBright} />
                <Text style={styles.capNum}>2</Text>
                <Text style={styles.capLabel}>Negotiation{'\n'}Rounds</Text>
              </View>
              <View style={styles.capItem}>
                <Leaf size={14} color={colors.primaryBright} />
                <Text style={styles.capNum}>Learns</Text>
                <Text style={styles.capLabel}>Your{'\n'}Preference</Text>
              </View>
            </View>
          </GlassCard>

          {/* Why GreenRoute Card -- same three features & copy as the web frontend's Home page. */}
          <GlassCard style={styles.whyCard} variant="dark">
            <View style={styles.whyHeader}>
              <Text style={styles.whyTitle}>Why GreenRoute?</Text>
              <View style={styles.whyBadge}>
                <Text style={styles.whyBadgeText}>AI + Math</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Clock size={15} color={colors.primaryBright} />
              </View>
              <View style={styles.featureBody}>
                <Text style={styles.featureTitle}>Save Travel Time</Text>
                <Text style={styles.featureDesc}>
                  Real-time surge monitoring & multi-modal routing to beat traffic bottlenecks.
                </Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Fuel size={15} color={colors.primaryBright} />
              </View>
              <View style={styles.featureBody}>
                <Text style={styles.featureTitle}>Cut Fuel & Costs</Text>
                <Text style={styles.featureDesc}>
                  Optimized route physics and transparent direct operating costs across modes.
                </Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Leaf size={15} color={colors.primaryBright} />
              </View>
              <View style={styles.featureBody}>
                <Text style={styles.featureTitle}>Lower Emissions</Text>
                <Text style={styles.featureDesc}>
                  Granular CO₂ calculations comparing cycling, two-wheelers, and cars.
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Demo Route Quick Shortcut Card -- copy, sparkline and layout match the web
              frontend's Home page exactly (same FIXED_TRIP corridor, same "~2 km, 3 modes"
              figure, same "View Route" label). */}
          <GlassCard style={styles.demoCard} variant="accent">
            <View style={styles.demoHeader}>
              <Text style={styles.demoTitle}>Try the Demo Route</Text>
              <Svg width={48} height={14} viewBox="0 0 64 20" fill="none">
                <Path
                  d="M2 15 Q 16 5, 28 12 T 48 6 T 62 14"
                  stroke={colors.primaryBright}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <Text style={styles.demoRouteText}>
              {FIXED_TRIP.originLabel} → {FIXED_TRIP.destinationLabel}
            </Text>
            <View style={styles.demoStatsRow}>
              <View style={styles.demoStatItem}>
                <Car size={11} color={colors.textMuted} />
                <Text style={styles.demoStatText}>~2 km, 3 modes</Text>
              </View>
              <View style={styles.demoStatItem}>
                <Leaf size={11} color={colors.primaryBright} />
                <Text style={[styles.demoStatText, { color: colors.primaryBright }]}>
                  Full negotiation + surge demo
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleLaunchDemoRoute}
              style={styles.demoLaunchBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.demoLaunchText}>{loading ? 'Loading…' : 'View Route'}</Text>
              <ArrowRight size={11} color={colors.primaryBright} />
            </TouchableOpacity>
          </GlassCard>

          {/* Backend connection -- a dev utility for pointing a physical device at the dev
              machine's LAN IP when auto-detection guesses wrong (services/api/client.ts), not a
              feature. Last on the page: it used to sit directly under the hero, spending the
              screen's best position on a debug control. */}
          <TouchableOpacity
            style={styles.connStrip}
            activeOpacity={0.7}
            onPress={() => setShowConnSettings((v) => !v)}
          >
            <Wifi size={11} color={colors.textDim} />
            <Text style={styles.connStripText} numberOfLines={1}>
              {getBaseUrl()}
            </Text>
            {showConnSettings ? (
              <ChevronUp size={12} color={colors.textDim} />
            ) : (
              <ChevronDown size={12} color={colors.textDim} />
            )}
          </TouchableOpacity>

          {showConnSettings && (
            <GlassCard style={styles.connCard} variant="dark">
              <View style={styles.connBody}>
                <Text style={styles.connHint}>
                  If routes keep timing out, this device may not be reaching the backend at the
                  address above. Enter your computer's LAN IP (e.g. http://192.168.1.100:8000)
                  and test it.
                </Text>
                <TextInput
                  style={styles.connInput}
                  value={baseUrlInput}
                  onChangeText={(t) => {
                    setBaseUrlInput(t);
                    setConnStatus('idle');
                  }}
                  placeholder="http://192.168.1.100:8000"
                  placeholderTextColor={colors.textDim}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <View style={styles.connActionsRow}>
                  <Button
                    title={connStatus === 'testing' ? 'Testing…' : 'Test & Save'}
                    onPress={handleTestConnection}
                    loading={connStatus === 'testing'}
                    variant="forest"
                    style={{ flex: 1 }}
                  />
                </View>
                {connStatus === 'ok' && (
                  <View style={styles.connStatusRow}>
                    <CheckCircle2 size={14} color={colors.primaryBright} />
                    <Text style={styles.connStatusOk}>Reachable -- saved for this session.</Text>
                  </View>
                )}
                {connStatus === 'fail' && (
                  <View style={styles.connStatusRow}>
                    <XCircle size={14} color={colors.red} />
                    <Text style={styles.connStatusFail}>{connError}</Text>
                  </View>
                )}
              </View>
            </GlassCard>
          )}
        </ScrollView>

        <LocationPickerModal
          visible={pickerType !== null}
          title={`Select ${pickerType === 'origin' ? 'Origin' : 'Destination'}`}
          onSelect={selectLocation}
          onClose={closePicker}
        />

        <VoiceFlowSheet
          visible={voiceSheetOpen}
          statusOf={voice.statusOf}
          transcript={voice.transcript}
          interpretation={voice.interpretation}
          script={voice.script}
          clarification={voice.clarification}
          error={voice.error}
          isSpeaking={voice.isSpeaking}
          onRetry={closeVoiceSheet}
          onReplay={voice.replay}
          onClose={closeVoiceSheet}
        />
      </View>
    </ImageBackground>
  );
};

function greeting(name: string | undefined): string {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  // First name only: the full name a user signed up with reads formally in a greeting, and a
  // signed-out visitor gets the greeting without a name rather than a placeholder.
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName ? `${timeOfDay}, ${firstName}` : timeOfDay;
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  darkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 20, 14, 0.72)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroSection: {
    gap: 2,
  },
  heroGreeting: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textWhite,
    letterSpacing: -0.3,
    lineHeight: 27,
  },
  heroAccent: {
    color: colors.primaryBright,
  },
  voiceCard: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 22,
  },
  voiceExample: {
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 4,
  },
  voiceQuote: {
    color: colors.textWhite,
    fontWeight: '700',
  },
  voiceDenied: {
    fontSize: 11,
    color: colors.amber,
    textAlign: 'center',
    lineHeight: 15,
  },
  plannerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
  },
  plannerToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  connStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  connStripText: {
    fontSize: 10,
    color: colors.textDim,
    fontWeight: '500',
  },
  connCard: {
    gap: 0,
    padding: 12,
  },
  connBody: {
    gap: 8,
  },
  connHint: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  connInput: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.textWhite,
  },
  connActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  connStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connStatusOk: {
    fontSize: 11,
    color: colors.primaryBright,
    flex: 1,
  },
  connStatusFail: {
    fontSize: 11,
    color: colors.red,
    flex: 1,
  },
  plannerCard: {
    gap: 12,
  },
  plannerHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textWhite,
    marginBottom: 2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  inputText: {
    color: colors.textWhite,
    fontSize: 13,
    fontWeight: '500',
  },
  preferenceSection: {
    gap: 8,
  },
  prefHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prefTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textDim,
    letterSpacing: 0.5,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleText: {
    fontSize: 10,
    color: colors.primaryBright,
    fontWeight: '700',
  },
  customWeightsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  priorityChip: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: radii.sm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priorityChipActive: {
    backgroundColor: 'rgba(77, 124, 62, 0.7)',
    borderColor: colors.primaryBright,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  priorityTextActive: {
    color: colors.textWhite,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.redSoft,
    borderRadius: radii.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.red,
  },
  errorText: {
    fontSize: 11,
    color: colors.red,
    flex: 1,
  },
  submitBtn: {
    marginTop: 4,
  },
  capCard: {
    padding: 10,
  },
  capGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  capItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  capNum: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textWhite,
    letterSpacing: -0.2,
  },
  capLabel: {
    fontSize: 8.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 11,
  },
  whyCard: {
    gap: 12,
  },
  whyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  whyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textWhite,
  },
  whyBadge: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(142, 224, 116, 0.3)',
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  whyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryBright,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 10,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(142, 224, 116, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureBody: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  demoCard: {
    gap: 6,
  },
  demoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSubtle,
  },
  demoRouteText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textWhite,
    marginTop: 1,
  },
  demoStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 3,
  },
  demoStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  demoStatText: {
    fontSize: 11,
    color: colors.textSubtle,
  },
  demoLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  demoLaunchText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryBright,
  },
});
