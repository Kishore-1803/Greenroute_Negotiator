import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  Modal,
  Alert,
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
  Scale,
  Clock,
  Fuel,
  MessageSquareText,
  SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react-native';
import { colors, radii } from '../theme/tokens';
import { GlassCard } from '../components/common/GlassCard';
import { Button } from '../components/common/Button';
import { Header } from '../components/common/Header';
import { PreferenceSlider } from '../components/common/PreferenceSlider';
import { MOCK_LOCATIONS, type LocationPoint } from '../lib/mockLocations';
import { FIXED_TRIP } from '../lib/fixedTrip';
import { getOrCreateUserId } from '../lib/userId';
import { tripsApi } from '../services/api/trips';
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
  const [origin, setOrigin] = useState<LocationPoint | null>(MOCK_LOCATIONS[0]);
  const [destination, setDestination] = useState<LocationPoint | null>(MOCK_LOCATIONS[1]);
  const [priority, setPriority] = useState<StatedPriority>('balanced');
  const [useCustomWeights, setUseCustomWeights] = useState(false);
  const [customWeights, setCustomWeights] = useState<CustomWeights>(DEFAULT_CUSTOM_WEIGHTS);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Autocomplete Modal state
  const [pickerType, setPickerType] = useState<'origin' | 'destination' | null>(null);

  const userId = useMemo(() => getOrCreateUserId(), []);

  function handleLocate() {
    setOrigin({
      id: 'gps',
      label: 'Your Location (Coimbatore)',
      lon: 76.9605,
      lat: 10.9955,
    });
  }

  async function handleFindRoute() {
    if (!origin || !destination) return;
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
        <Header currentRouteName="Home" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Branding */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Smarter Routes</Text>
            <Text style={styles.heroAccent}>Greener Future</Text>
            <Text style={styles.heroSubtitle}>
              Find the most efficient and eco-friendly ways to travel. For you. For everyone.
            </Text>
          </View>

          {/* Plan Your Route Glass Card */}
          <GlassCard style={styles.plannerCard} variant="light">
            <Text style={styles.plannerHeading}>Plan Your Route</Text>

            {/* Origin Input */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setPickerType('origin')}
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
              onPress={() => setPickerType('destination')}
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

            {errorMsg ? (
              <View style={styles.errorBanner}>
                <AlertTriangle size={14} color={colors.red} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

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

          {/* Capability Metric Chips */}
          <GlassCard style={styles.metricsCard} variant="light">
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Car size={16} color={colors.primaryBright} />
                <Text style={styles.metricVal}>3</Text>
                <Text style={styles.metricLbl}>Modes</Text>
              </View>
              <View style={styles.metricItem}>
                <MessageSquareText size={16} color={colors.primaryBright} />
                <Text style={styles.metricVal}>3</Text>
                <Text style={styles.metricLbl}>Agents</Text>
              </View>
              <View style={styles.metricItem}>
                <Scale size={16} color={colors.primaryBright} />
                <Text style={styles.metricVal}>2</Text>
                <Text style={styles.metricLbl}>Rounds</Text>
              </View>
              <View style={styles.metricItem}>
                <Leaf size={16} color={colors.primaryBright} />
                <Text style={styles.metricVal}>Learns</Text>
                <Text style={styles.metricLbl}>Preference</Text>
              </View>
            </View>
          </GlassCard>

          {/* Demo Route Quick Shortcut Card */}
          <GlassCard style={styles.demoCard} variant="accent">
            <View style={styles.demoHeader}>
              <Text style={styles.demoTitle}>Try the Demo Route</Text>
              <Text style={styles.demoTag}>Live OSRM</Text>
            </View>
            <Text style={styles.demoRouteText}>
              {FIXED_TRIP.originLabel} → {FIXED_TRIP.destinationLabel}
            </Text>
            <Text style={styles.demoDesc}>
              ~2 km Coimbatore corridor with multi-agent debate and traffic surge.
            </Text>
            <TouchableOpacity
              onPress={handleLaunchDemoRoute}
              style={styles.demoLaunchBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.demoLaunchText}>Launch Demo</Text>
              <ArrowRight size={12} color={colors.primaryBright} />
            </TouchableOpacity>
          </GlassCard>

          {/* Why GreenRoute Feature Cards */}
          <GlassCard style={styles.featuresCard} variant="dark">
            <Text style={styles.featuresHeading}>Why GreenRoute?</Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Clock size={16} color={colors.primaryBright} />
                </View>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>Save Travel Time</Text>
                  <Text style={styles.featureDesc}>
                    Real-time surge monitoring & multi-modal routing to beat bottlenecks.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Fuel size={16} color={colors.primaryBright} />
                </View>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>Cut Fuel & Costs</Text>
                  <Text style={styles.featureDesc}>
                    Optimized route physics and transparent direct operating costs.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Leaf size={16} color={colors.primaryBright} />
                </View>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>Lower Emissions</Text>
                  <Text style={styles.featureDesc}>
                    Granular CO₂ calculations comparing cycling, two-wheelers, and cars.
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </ScrollView>

        {/* Location Picker Modal */}
        <Modal
          visible={pickerType !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerType(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Select {pickerType === 'origin' ? 'Origin' : 'Destination'}
              </Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {MOCK_LOCATIONS.map((loc) => (
                  <TouchableOpacity
                    key={loc.id}
                    style={styles.modalItem}
                    onPress={() => {
                      if (pickerType === 'origin') setOrigin(loc);
                      if (pickerType === 'destination') setDestination(loc);
                      setPickerType(null);
                    }}
                  >
                    <MapPin size={16} color={colors.primaryBright} />
                    <Text style={styles.modalItemText}>{loc.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Button
                title="Cancel"
                variant="glass"
                onPress={() => setPickerType(null)}
                style={{ marginTop: 12 }}
              />
            </View>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
};

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
    paddingBottom: 40,
    gap: 16,
  },
  heroSection: {
    marginTop: 8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textWhite,
    letterSpacing: -0.5,
  },
  heroAccent: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primaryBright,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.textSubtle,
    marginTop: 4,
    lineHeight: 18,
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
  metricsCard: {
    padding: 0,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: {
    alignItems: 'center',
    gap: 2,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textWhite,
  },
  metricLbl: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
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
    fontWeight: '700',
    color: colors.primaryBright,
  },
  demoTag: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryBright,
    backgroundColor: colors.primarySoft,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.full,
  },
  demoRouteText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textWhite,
  },
  demoDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
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
  featuresCard: {
    gap: 12,
  },
  featuresHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textWhite,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextCol: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textWhite,
  },
  featureDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E2D24',
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textWhite,
    marginBottom: 12,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalItemText: {
    color: colors.textWhite,
    fontSize: 13,
    flex: 1,
  },
});
