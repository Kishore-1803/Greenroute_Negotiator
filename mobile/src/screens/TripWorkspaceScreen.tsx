import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  CheckCircle2,
  Fuel,
  RefreshCw,
  ThumbsUp,
  Sparkles,
  Zap,
  IndianRupee,
  Leaf,
  Bike,
  Scale,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react-native';
import { colors, radii } from '../theme/tokens';
import { GlassCard } from '../components/common/GlassCard';
import { Button } from '../components/common/Button';
import { ModeIcon } from '../components/common/ModeIcon';
import { LocationPickerModal } from '../components/common/LocationPickerModal';
import { RouteMap, RouteGeometryInput } from '../components/map/RouteMap';
import { MODE_LABEL, TRAVEL_MODES, type TravelMode } from '../types/mode';
import {
  formatCarbon,
  formatCost,
  formatDistance,
  formatMinutes,
} from '../lib/formatMetrics';
import { tripsApi } from '../services/api/trips';
import { useTripUserId } from '../lib/userId';
import {
  OBJECTION_CATEGORIES,
  type BaselineResponse,
  type ConditionChangeResponse,
  type ExplanationResponse,
  type NegotiationResponse,
  type ObjectionCategory,
  type SelectionResponse,
} from '../services/api/types';
import { MOCK_LOCATIONS, type LocationPoint } from '../lib/mockLocations';

const OBJECTION_LABELS: Record<ObjectionCategory, string> = {
  why_switch: 'Why switch?',
  why_stay: 'Why stay?',
  what_changed: 'What changed?',
  is_traffic_real: 'Is traffic real?',
  are_emissions_exact: 'Are emissions exact?',
  why_this_mode: 'Why this mode?',
};

const AGENT_META = {
  speed: { label: 'Speed Agent', icon: Zap, color: colors.sky, bg: colors.skySoft },
  cost: { label: 'Cost Agent', icon: IndianRupee, color: colors.amber, bg: colors.amberSoft },
  carbon: { label: 'Carbon Agent', icon: Leaf, color: colors.primaryBright, bg: colors.primarySoft },
};

export const TripWorkspaceScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const initialBaseline = route.params?.baseline as BaselineResponse | undefined;
  const initialOrigin = route.params?.origin as LocationPoint | undefined;
  const initialDest = route.params?.destination as LocationPoint | undefined;

  const [origin, setOrigin] = useState<LocationPoint>(initialOrigin || MOCK_LOCATIONS[0]);
  const [destination, setDestination] = useState<LocationPoint>(initialDest || MOCK_LOCATIONS[1]);
  const [baselineData, setBaselineData] = useState<BaselineResponse | undefined>(initialBaseline);
  const [selectedMode, setSelectedMode] = useState<TravelMode>(
    initialBaseline?.best_mode || 'car'
  );

  const [conditionData, setConditionData] = useState<ConditionChangeResponse | undefined>();
  const [explanationData, setExplanationData] = useState<ExplanationResponse | undefined>();
  const [negotiationData, setNegotiationData] = useState<NegotiationResponse | undefined>();
  const [selectionResult, setSelectionResult] = useState<SelectionResponse | undefined>();

  // Loading states
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [surgeLoading, setSurgeLoading] = useState(false);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [negotiationLoading, setNegotiationLoading] = useState(false);
  const [selectionLoading, setSelectionLoading] = useState(false);

  const [pendingObjection, setPendingObjection] = useState<ObjectionCategory | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable Route Planner (matches the web frontend's DecisionWorkspacePanel, which lets you
  // change origin/destination from inside Trip Workspace, not just from Home). Selecting a new
  // point re-runs the baseline for the currently selected mode.
  const [locationPicker, setLocationPicker] = useState<'origin' | 'destination' | null>(null);

  const userId = useTripUserId();
  const activeTripId = baselineData?.trip_id;

  // Auto-fetch baseline if none passed. Depends on userId, not just mount: the id resolves
  // asynchronously from device storage, so on a cold open this effect's first run happens while
  // it is still null and handleFetchBaseline bails. Re-running once it lands is what actually
  // loads the trip.
  useEffect(() => {
    if (!baselineData && userId) {
      handleFetchBaseline(selectedMode);
    }
  }, [userId]);

  // This screen is a bottom-tab screen, so it stays mounted across navigations -- it does
  // NOT get a fresh instance (and fresh useState initializers) each time Home navigates here
  // with a new trip. Without this, origin/destination/baselineData stay stuck on whatever was
  // passed in on the very first visit to this tab, even though every subsequent
  // /trips/baseline call succeeds with the new coordinates (see the backend logs -- it's
  // fetching correctly, this screen just never displays it). Re-sync local state whenever a
  // genuinely new trip_id arrives via route.params.
  const incomingTripId = route.params?.baseline?.trip_id as string | undefined;
  useEffect(() => {
    if (!incomingTripId || incomingTripId === baselineData?.trip_id) return;
    setBaselineData(route.params.baseline);
    setOrigin(route.params.origin || MOCK_LOCATIONS[0]);
    setDestination(route.params.destination || MOCK_LOCATIONS[1]);
    setSelectedMode(route.params.baseline?.best_mode || 'car');
    setConditionData(undefined);
    setExplanationData(undefined);
    setNegotiationData(undefined);
    setSelectionResult(undefined);
    setErrorMsg(null);
  }, [incomingTripId]);

  // Auto-fetch initial explanation when baseline is ready
  useEffect(() => {
    if (activeTripId && !explanationData && !explanationLoading) {
      handleFetchExplanation(activeTripId);
    }
  }, [activeTripId]);

  async function handleFetchBaseline(
    mode: TravelMode,
    overrideOrigin?: LocationPoint,
    overrideDestination?: LocationPoint
  ) {
    const originPoint = overrideOrigin || origin;
    const destinationPoint = overrideDestination || destination;
    // Null only for the moment device storage takes to resolve the id. Waiting beats sending a
    // placeholder: a trip attributed to the wrong id trains the wrong preferences, silently.
    if (!userId) return;
    setBaselineLoading(true);
    setErrorMsg(null);
    try {
      const data = await tripsApi.baseline({
        origin_lon: originPoint.lon,
        origin_lat: originPoint.lat,
        dest_lon: destinationPoint.lon,
        dest_lat: destinationPoint.lat,
        current_mode: mode,
        user_id: userId,
      });
      setBaselineData(data);
      setSelectedMode(data.best_mode || mode);
      setConditionData(undefined);
      setExplanationData(undefined);
      setNegotiationData(undefined);
      setSelectionResult(undefined);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch baseline routes.');
    } finally {
      setBaselineLoading(false);
    }
  }

  function handleSelectLocation(loc: LocationPoint) {
    const newOrigin = locationPicker === 'origin' ? loc : origin;
    const newDestination = locationPicker === 'destination' ? loc : destination;
    setOrigin(newOrigin);
    setDestination(newDestination);
    setLocationPicker(null);
    handleFetchBaseline(selectedMode, newOrigin, newDestination);
  }

  async function handleFetchExplanation(tripId: string, category?: ObjectionCategory) {
    setExplanationLoading(true);
    try {
      const exp = await tripsApi.explanation(tripId, { objection_category: category });
      setExplanationData(exp);
    } catch (err: any) {
      // Quiet fail or set fallback
    } finally {
      setExplanationLoading(false);
      setPendingObjection(null);
    }
  }

  async function handleSimulateSurge() {
    if (!activeTripId) return;
    setSurgeLoading(true);
    setErrorMsg(null);
    try {
      const data = await tripsApi.conditionChange(activeTripId);
      setConditionData(data);
      // Re-fetch explanation for new decision
      handleFetchExplanation(activeTripId);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to simulate traffic surge.');
    } finally {
      setSurgeLoading(false);
    }
  }

  async function handleRunNegotiation() {
    if (!activeTripId) return;
    setNegotiationLoading(true);
    try {
      const neg = await tripsApi.negotiation(activeTripId);
      setNegotiationData(neg);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to run agent negotiation.');
    } finally {
      setNegotiationLoading(false);
    }
  }

  async function handleConfirmSelection(mode: TravelMode) {
    if (!activeTripId) return;
    setSelectionLoading(true);
    try {
      const res = await tripsApi.selection(activeTripId, { selected_mode: mode });
      setSelectionResult(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record selection.');
    } finally {
      setSelectionLoading(false);
    }
  }

  // Map route geometries
  const mapRoutes = useMemo<RouteGeometryInput[]>(() => {
    if (!baselineData) return [];

    if (conditionData) {
      const { after, switch_decision } = conditionData;
      const primaryMode =
        switch_decision.decision === 'SWITCH'
          ? switch_decision.recommended_mode
          : switch_decision.current_mode;

      const routes: RouteGeometryInput[] = after.modes
        .filter((m) => m.route_geometry)
        .map((m) => ({
          mode: m.mode,
          geometry: m.route_geometry!,
          role: m.mode === primaryMode ? 'primary' : 'secondary',
        }));

      const baselineCar = baselineData.modes.find((m) => m.mode === 'car');
      const afterCar = after.modes.find((m) => m.mode === 'car');
      if (
        baselineCar?.route_geometry &&
        afterCar?.route_geometry &&
        JSON.stringify(baselineCar.route_geometry) !== JSON.stringify(afterCar.route_geometry)
      ) {
        routes.push({
          mode: 'car-before-surge',
          geometry: baselineCar.route_geometry,
          role: 'ghost',
        });
      }
      return routes;
    }

    return baselineData.modes
      .filter((m) => m.route_geometry)
      .map((m) => ({
        mode: m.mode,
        geometry: m.route_geometry!,
        role: m.mode === selectedMode ? 'primary' : 'secondary',
      }));
  }, [baselineData, conditionData, selectedMode]);

  // Matches the web frontend's DecisionWorkspacePanel: the distance shown next to "Route
  // Comparison" tracks whichever mode is currently selected, not always the first entry.
  const currentBaselineMode =
    baselineData?.modes.find((m) => m.mode === selectedMode) || baselineData?.modes[0];

  // Surge calculation deltas
  const beforeSelected = conditionData?.before.modes.find((m) => m.mode === selectedMode);
  const afterSelected = conditionData?.after.modes.find((m) => m.mode === selectedMode);
  const surgeTimeDelta =
    beforeSelected?.duration_min != null && afterSelected?.duration_min != null
      ? Math.round(afterSelected.duration_min - beforeSelected.duration_min)
      : 0;
  const surgeCostDelta =
    beforeSelected?.estimated_cost_inr != null && afterSelected?.estimated_cost_inr != null
      ? Math.round(afterSelected.estimated_cost_inr - beforeSelected.estimated_cost_inr)
      : 0;
  const surgeCarbonDelta =
    beforeSelected?.estimated_carbon_g != null && afterSelected?.estimated_carbon_g != null
      ? Math.round(afterSelected.estimated_carbon_g - beforeSelected.estimated_carbon_g)
      : 0;

  const decision = conditionData?.switch_decision;
  const afterRecommendedMode = decision?.recommended_mode
    ? conditionData?.after.modes.find((m) => m.mode === decision.recommended_mode)
    : undefined;

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
          {/* Section 1: Route Planner -- editable From/To (matches the web frontend's
              DecisionWorkspacePanel, which lets you change the trip from inside the workspace,
              not just from Home) + Vehicle Mode Selector. */}
          <GlassCard style={styles.sectionCard} variant="dark">
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>ROUTE PLANNER</Text>
              {baselineLoading ? (
                <ActivityIndicator size="small" color={colors.primaryBright} />
              ) : null}
            </View>

            <View style={styles.plannerFields}>
              <View style={styles.plannerConnectorLine} />
              <View style={styles.plannerRow}>
                <View style={[styles.plannerDot, styles.plannerDotFrom]} />
                <TouchableOpacity
                  style={styles.plannerField}
                  onPress={() => setLocationPicker('origin')}
                  disabled={baselineLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.plannerFieldLabel}>From</Text>
                  <Text style={styles.plannerFieldValue} numberOfLines={1}>
                    {origin.label}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.plannerRow}>
                <View style={[styles.plannerDot, styles.plannerDotTo]} />
                <TouchableOpacity
                  style={[styles.plannerField, styles.plannerFieldTo]}
                  onPress={() => setLocationPicker('destination')}
                  disabled={baselineLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.plannerFieldLabel}>To</Text>
                  <Text style={styles.plannerFieldValue} numberOfLines={1}>
                    {destination.label}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modeRow}>
              {TRAVEL_MODES.map((mode) => {
                const isSelected = selectedMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => {
                      setSelectedMode(mode);
                      handleFetchBaseline(mode);
                    }}
                    style={[
                      styles.modeBtn,
                      isSelected && styles.modeBtnActive,
                    ]}
                  >
                    <ModeIcon
                      mode={mode}
                      size={18}
                      color={isSelected ? colors.textWhite : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.modeLabel,
                        isSelected && styles.modeLabelActive,
                      ]}
                    >
                      {MODE_LABEL[mode]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassCard>

          {/* Section 2: Interactive Route Map */}
          <GlassCard style={styles.mapCard} variant="dark">
            <RouteMap
              routes={mapRoutes}
              selectedMode={selectedMode}
              originLabel={origin.label.split(',')[0]}
              destinationLabel={destination.label.split(',')[0]}
            />
          </GlassCard>

          {/* Section 3: 3-Mode Comparison Cards */}
          <GlassCard style={styles.sectionCard} variant="dark">
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>ROUTE COMPARISON</Text>
              {currentBaselineMode && (
                <Text style={styles.distBadge}>
                  {formatDistance(currentBaselineMode.distance_km)}
                </Text>
              )}
            </View>

            {baselineData ? (
              <View style={styles.modeCardsList}>
                {TRAVEL_MODES.map((mode) => {
                  const m = baselineData.modes.find((mm) => mm.mode === mode);
                  const utility = baselineData.utilities[mode];
                  const isRecommended = baselineData.best_mode === mode;
                  const isSelected = selectedMode === mode;

                  return (
                    <TouchableOpacity
                      key={mode}
                      activeOpacity={0.8}
                      onPress={() => setSelectedMode(mode)}
                      style={[
                        styles.compareCard,
                        isSelected && styles.compareCardSelected,
                      ]}
                    >
                      <View style={styles.compareLeft}>
                        <ModeIcon mode={mode} size={18} color={colors.textWhite} />
                        <View>
                          <View style={styles.modeNameRow}>
                            <Text style={styles.modeName}>{MODE_LABEL[mode]}</Text>
                            {isRecommended && (
                              <View style={styles.recBadge}>
                                <Text style={styles.recBadgeText}>RECOMMENDED</Text>
                              </View>
                            )}
                          </View>
                          {m ? (
                            <View style={styles.metricsRow}>
                              <Text style={styles.metricText}>
                                {formatMinutes(m.duration_min)}
                              </Text>
                              <Text style={styles.metricDot}>•</Text>
                              <Text style={styles.metricText}>
                                {formatCost(m.estimated_cost_inr)}
                              </Text>
                              <Text style={styles.metricDot}>•</Text>
                              <Text style={styles.metricText}>
                                {formatCarbon(m.estimated_carbon_g)}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.metricText}>Unavailable</Text>
                          )}
                        </View>
                      </View>

                      {utility && (
                        <View style={styles.utilityCol}>
                          <Text style={styles.utilityLabel}>UTILITY</Text>
                          <Text style={styles.utilityScore}>
                            {utility.utility.toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <ActivityIndicator size="small" color={colors.primaryBright} />
            )}
          </GlassCard>

          {/* Section 4: Traffic Scenario Surge Simulation */}
          <GlassCard style={styles.sectionCard} variant="dark">
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>TRAFFIC SCENARIO</Text>
              {conditionData && (
                <View style={styles.surgeActiveTag}>
                  <Text style={styles.surgeActiveText}>Surge Active</Text>
                </View>
              )}
            </View>

            {!conditionData ? (
              <View style={styles.surgeTriggerBox}>
                <Text style={styles.surgeDesc}>
                  Simulate a traffic surge on the corridor to evaluate how the route decision and travel metrics change.
                </Text>
                <Button
                  title={surgeLoading ? 'Evaluating surge…' : 'Simulate Traffic Surge'}
                  onPress={handleSimulateSurge}
                  loading={surgeLoading}
                  variant="forest"
                  icon={<Fuel size={14} color={colors.textWhite} />}
                />
              </View>
            ) : (
              <View style={styles.surgeResultBox}>
                <View style={styles.surgeResultHeader}>
                  <Text style={styles.surgeImpactTitle}>Corridor Traffic Impact</Text>
                  <TouchableOpacity onPress={handleSimulateSurge} disabled={surgeLoading}>
                    <Text style={styles.reSimulateText}>Re-simulate</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.impactGrid}>
                  <View style={styles.impactCol}>
                    <Text style={styles.impactLabel}>Time Impact</Text>
                    <Text style={styles.impactVal}>
                      {surgeTimeDelta >= 0 ? `+${surgeTimeDelta}` : surgeTimeDelta} min
                    </Text>
                  </View>
                  <View style={styles.impactCol}>
                    <Text style={styles.impactLabel}>Cost Impact</Text>
                    <Text style={styles.impactVal}>
                      {surgeCostDelta >= 0 ? `+₹${surgeCostDelta}` : `₹${surgeCostDelta}`}
                    </Text>
                  </View>
                  <View style={styles.impactCol}>
                    <Text style={styles.impactLabel}>CO₂ Impact</Text>
                    <Text style={styles.impactVal}>
                      {surgeCarbonDelta >= 0 ? `+${surgeCarbonDelta}` : surgeCarbonDelta} g
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </GlassCard>

          {/* Section 5: Surge Decision (SWITCH / STAY) */}
          {conditionData && decision && (
            <GlassCard
              style={[
                styles.sectionCard,
                decision.decision === 'SWITCH' && styles.switchDecisionCard,
              ]}
              variant={decision.decision === 'SWITCH' ? 'accent' : 'dark'}
            >
              <View style={styles.decisionHeader}>
                <View style={styles.decisionTitleRow}>
                  <CheckCircle2 size={16} color={colors.primaryBright} />
                  <Text style={styles.decisionMainText}>
                    {decision.decision === 'SWITCH' ? 'SWITCH ROUTE / MODE' : 'STAY ON ROUTE'}
                  </Text>
                </View>
                <Text style={styles.deterministicTag}>Deterministic</Text>
              </View>

              <Text style={styles.decisionReason}>
                {decision.reason ||
                  (decision.decision === 'SWITCH' && decision.recommended_mode
                    ? `Switching to ${MODE_LABEL[decision.recommended_mode] || decision.recommended_mode} reduces travel time and overall emissions.`
                    : 'The current route remains optimal under the simulated traffic conditions.')}
              </Text>

              {decision.decision === 'SWITCH' && decision.recommended_mode && afterSelected && afterRecommendedMode && (
                <View style={styles.tableBox}>
                  <View style={styles.tableRowHeader}>
                    <Text style={styles.thCell}>Metric</Text>
                    <Text style={styles.thCell}>Current ({MODE_LABEL[selectedMode]})</Text>
                    <Text style={[styles.thCell, { color: colors.primaryBright }]}>
                      Alt ({MODE_LABEL[decision.recommended_mode]})
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tdCellLabel}>Time</Text>
                    <Text style={styles.tdCell}>
                      {formatMinutes(afterSelected.duration_min)}
                    </Text>
                    <Text style={[styles.tdCell, styles.tdCellAlt]}>
                      {formatMinutes(afterRecommendedMode.duration_min)}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tdCellLabel}>Cost</Text>
                    <Text style={styles.tdCell}>
                      {formatCost(afterSelected.estimated_cost_inr)}
                    </Text>
                    <Text style={[styles.tdCell, styles.tdCellAlt]}>
                      {formatCost(afterRecommendedMode.estimated_cost_inr)}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tdCellLabel}>CO₂</Text>
                    <Text style={styles.tdCell}>
                      {formatCarbon(afterSelected.estimated_carbon_g)}
                    </Text>
                    <Text style={[styles.tdCell, styles.tdCellAlt]}>
                      {formatCarbon(afterRecommendedMode.estimated_carbon_g)}
                    </Text>
                  </View>
                </View>
              )}
            </GlassCard>
          )}

          {/* Section 6: Preference Feedback Loop ("Your Choice") */}
          <GlassCard style={styles.sectionCard} variant="dark">
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>YOUR CHOICE</Text>
              {selectionResult && (
                <Text style={styles.feedbackSuccessText}>
                  {selectionResult.weights_changed ? 'Preference updated' : 'Matches recommendation'}
                </Text>
              )}
            </View>

            <Text style={styles.choiceSub}>What will you actually do?</Text>

            <Button
              title={
                selectionLoading
                  ? 'Recording selection…'
                  : `Confirm I'm going with ${MODE_LABEL[selectedMode]}`
              }
              onPress={() => handleConfirmSelection(selectedMode)}
              loading={selectionLoading}
              variant="glass"
              icon={<ThumbsUp size={14} color={colors.primaryBright} />}
            />

            {selectionResult && (
              <View style={styles.weightsBarBox}>
                <Text style={styles.weightsBarTitle}>
                  Learned weights · Trip #{selectionResult.preference.trip_count}
                </Text>
                <View style={styles.weightItem}>
                  <Text style={styles.weightLabel}>Speed</Text>
                  <View style={styles.weightTrack}>
                    <View
                      style={[
                        styles.weightFill,
                        {
                          width: `${Math.round(selectionResult.preference.w_time * 100)}%`,
                          backgroundColor: colors.sky,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.weightPct}>
                    {Math.round(selectionResult.preference.w_time * 100)}%
                  </Text>
                </View>
                <View style={styles.weightItem}>
                  <Text style={styles.weightLabel}>Cost</Text>
                  <View style={styles.weightTrack}>
                    <View
                      style={[
                        styles.weightFill,
                        {
                          width: `${Math.round(selectionResult.preference.w_cost * 100)}%`,
                          backgroundColor: colors.amber,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.weightPct}>
                    {Math.round(selectionResult.preference.w_cost * 100)}%
                  </Text>
                </View>
                <View style={styles.weightItem}>
                  <Text style={styles.weightLabel}>Carbon</Text>
                  <View style={styles.weightTrack}>
                    <View
                      style={[
                        styles.weightFill,
                        {
                          width: `${Math.round(selectionResult.preference.w_carbon * 100)}%`,
                          backgroundColor: colors.primaryBright,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.weightPct}>
                    {Math.round(selectionResult.preference.w_carbon * 100)}%
                  </Text>
                </View>
              </View>
            )}
          </GlassCard>

          {/* Section 7: Grounded AI Explanation & Objections */}
          <GlassCard style={styles.sectionCard} variant="dark">
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>
                {conditionData ? 'WHY THIS DECISION?' : 'WHY THIS RECOMMENDATION?'}
              </Text>
              <Text style={styles.mathGroundedTag}>AI Grounded in Backend Math</Text>
            </View>

            {explanationLoading ? (
              <View style={styles.loadingExpRow}>
                <RefreshCw size={14} color={colors.primaryBright} />
                <Text style={styles.loadingExpText}>Generating fact-grounded explanation…</Text>
              </View>
            ) : explanationData ? (
              <View style={styles.expContentBox}>
                <Text style={styles.expText}>
                  {explanationData.summary || explanationData.reason}
                </Text>
                {explanationData.limitations && explanationData.limitations.length > 0 ? (
                  <View style={styles.limitationBox}>
                    <Text style={styles.limitationHeader}>Model context:</Text>
                    {explanationData.limitations.map((lim, i) => (
                      <Text key={i} style={styles.limitationItem}>
                        • {lim}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Objection Buttons */}
            <View style={styles.objectionRow}>
              {OBJECTION_CATEGORIES.map((cat) => {
                const isPending = pendingObjection === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    disabled={pendingObjection !== null}
                    onPress={() => {
                      if (activeTripId) {
                        setPendingObjection(cat);
                        handleFetchExplanation(activeTripId, cat);
                      }
                    }}
                    style={[
                      styles.objectionChip,
                      isPending && styles.objectionChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.objectionText,
                        isPending && styles.objectionTextActive,
                      ]}
                    >
                      {isPending ? 'Answering…' : OBJECTION_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassCard>

          {/* Section 8: Multi-Agent Negotiation Feed */}
          <GlassCard style={styles.sectionCard} variant="dark">
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>AGENT NEGOTIATION</Text>
              {negotiationData?.coordinator && (
                <Text style={styles.winnerBadge}>
                  Winner: {MODE_LABEL[negotiationData.coordinator.winner]}
                </Text>
              )}
            </View>

            {!negotiationData ? (
              <View style={styles.negIntroBox}>
                <Sparkles size={20} color={colors.primaryBright} />
                <Text style={styles.negIntroTitle}>Agent Negotiation</Text>
                <Text style={styles.negIntroDesc}>
                  Speed, Cost, and Carbon agents argue over the real route metrics across two rounds, then a Coordinator narrates the deterministic winner.
                </Text>
                <Button
                  title={negotiationLoading ? 'Agents negotiating…' : 'Start Negotiation'}
                  onPress={handleRunNegotiation}
                  loading={negotiationLoading}
                  variant="forest"
                />
              </View>
            ) : (
              <View style={styles.negFeedList}>
                {/* Round 1 */}
                <Text style={styles.roundHeader}>ROUND 1 — OPENING ARGUMENTS</Text>
                {negotiationData.round_1.map((arg, idx) => {
                  const meta = AGENT_META[arg.agent] || AGENT_META.speed;
                  const Icon = meta.icon;
                  return (
                    <View key={`r1-${idx}`} style={[styles.agentBubble, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                      <View style={styles.agentHeader}>
                        <View style={styles.agentNameRow}>
                          <Icon size={14} color={meta.color} />
                          <Text style={[styles.agentName, { color: meta.color }]}>
                            {meta.label}
                          </Text>
                        </View>
                        <Text style={styles.advocatingText}>
                          advocating {MODE_LABEL[arg.mode_advocated] || arg.mode_advocated}
                        </Text>
                      </View>
                      <Text style={styles.agentMsg}>{arg.message}</Text>
                    </View>
                  );
                })}

                {/* Round 2 */}
                <Text style={[styles.roundHeader, { marginTop: 10 }]}>ROUND 2 — REBUTTALS</Text>
                {negotiationData.round_2.map((arg, idx) => {
                  const meta = AGENT_META[arg.agent] || AGENT_META.speed;
                  const Icon = meta.icon;
                  return (
                    <View key={`r2-${idx}`} style={[styles.agentBubble, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                      <View style={styles.agentHeader}>
                        <View style={styles.agentNameRow}>
                          <Icon size={14} color={meta.color} />
                          <Text style={[styles.agentName, { color: meta.color }]}>
                            {meta.label}
                          </Text>
                        </View>
                        {arg.stance && (
                          <View style={styles.stanceBadge}>
                            <Text style={styles.stanceText}>{arg.stance}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.agentMsg}>{arg.message}</Text>
                    </View>
                  );
                })}

                {/* Coordinator Winner Box */}
                <View style={styles.coordinatorCard}>
                  <View style={styles.coordHeader}>
                    <Text style={styles.coordTitle}>COORDINATOR DECISION</Text>
                    <Text style={styles.coordProvider}>
                      {negotiationData.coordinator.provider === 'groq' ? 'AI Narrated' : 'Fallback'}
                    </Text>
                  </View>
                  <View style={styles.coordWinnerRow}>
                    <Bike size={16} color={colors.primaryBright} />
                    <Text style={styles.coordWinnerText}>
                      Winner: {MODE_LABEL[negotiationData.coordinator.winner] || negotiationData.coordinator.winner}
                    </Text>
                  </View>
                  <Text style={styles.coordSummary}>{negotiationData.coordinator.summary}</Text>
                </View>
              </View>
            )}
          </GlassCard>

          {errorMsg ? (
            <View style={styles.errorCard}>
              <AlertTriangle size={16} color={colors.red} />
              <Text style={styles.errorCardText}>{errorMsg}</Text>
            </View>
          ) : null}
        </ScrollView>

        <LocationPickerModal
          visible={locationPicker !== null}
          title={`Select ${locationPicker === 'origin' ? 'Origin' : 'Destination'}`}
          onSelect={handleSelectLocation}
          onClose={() => setLocationPicker(null)}
        />
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
    backgroundColor: 'rgba(10, 20, 14, 0.75)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  sectionCard: {
    gap: 10,
  },
  mapCard: {
    padding: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textDim,
    letterSpacing: 0.8,
  },
  distBadge: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  plannerFields: {
    position: 'relative',
    gap: 6,
  },
  plannerConnectorLine: {
    position: 'absolute',
    left: 4,
    top: 14,
    bottom: 14,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  plannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  plannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 1,
    zIndex: 1,
  },
  plannerDotFrom: {
    backgroundColor: colors.textWhite,
  },
  plannerDotTo: {
    backgroundColor: colors.primaryBright,
  },
  plannerField: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  plannerFieldTo: {
    borderColor: 'rgba(142, 224, 116, 0.25)',
  },
  plannerFieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  plannerFieldValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textWhite,
    marginTop: 1,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modeBtnActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryBright,
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modeLabelActive: {
    color: colors.textWhite,
    fontWeight: '700',
  },
  modeCardsList: {
    gap: 8,
  },
  compareCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  compareCardSelected: {
    backgroundColor: 'rgba(77, 124, 62, 0.3)',
    borderColor: colors.primaryBright,
  },
  compareLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textWhite,
  },
  recBadge: {
    backgroundColor: colors.primaryBright,
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: radii.full,
  },
  recBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.textDark,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metricText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  metricDot: {
    color: colors.textDim,
    fontSize: 10,
  },
  utilityCol: {
    alignItems: 'flex-end',
  },
  utilityLabel: {
    fontSize: 8,
    color: colors.textDim,
    fontWeight: '700',
  },
  utilityScore: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryBright,
    fontVariant: ['tabular-nums'],
  },
  surgeActiveTag: {
    backgroundColor: colors.amberSoft,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  surgeActiveText: {
    color: colors.amber,
    fontSize: 9,
    fontWeight: '800',
  },
  surgeTriggerBox: {
    gap: 8,
  },
  surgeDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  surgeResultBox: {
    backgroundColor: colors.amberSoft,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    gap: 8,
  },
  surgeResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  surgeImpactTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.amber,
  },
  reSimulateText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.amber,
    textDecorationLine: 'underline',
  },
  impactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  impactCol: {
    alignItems: 'center',
    gap: 2,
  },
  impactLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  impactVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.amber,
  },
  switchDecisionCard: {
    borderColor: colors.primaryBright,
  },
  decisionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  decisionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  decisionMainText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textWhite,
  },
  deterministicTag: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primaryBright,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.sm,
  },
  decisionReason: {
    fontSize: 11,
    color: colors.textSubtle,
    lineHeight: 16,
  },
  tableBox: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 6,
    gap: 4,
  },
  tableRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  thCell: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textDim,
    flex: 1,
  },
  tdCellLabel: {
    fontSize: 10,
    color: colors.textMuted,
    flex: 1,
  },
  tdCell: {
    fontSize: 11,
    color: colors.textSubtle,
    flex: 1,
  },
  tdCellAlt: {
    color: colors.primaryBright,
    fontWeight: '700',
  },
  choiceSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  feedbackSuccessText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryBright,
  },
  weightsBarBox: {
    marginTop: 6,
    gap: 6,
  },
  weightsBarTitle: {
    fontSize: 9,
    color: colors.textDim,
    fontWeight: '700',
  },
  weightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weightLabel: {
    width: 45,
    fontSize: 10,
    color: colors.textMuted,
  },
  weightTrack: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  weightFill: {
    height: '100%',
    borderRadius: 3,
  },
  weightPct: {
    width: 30,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'right',
  },
  mathGroundedTag: {
    fontSize: 9,
    color: colors.textDim,
  },
  loadingExpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  loadingExpText: {
    fontSize: 11,
    color: colors.primaryBright,
  },
  expContentBox: {
    gap: 6,
  },
  expText: {
    fontSize: 11,
    color: colors.textSubtle,
    lineHeight: 16,
  },
  limitationBox: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 4,
    gap: 2,
  },
  limitationHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  limitationItem: {
    fontSize: 10,
    color: colors.textDim,
  },
  objectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  objectionChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: radii.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  objectionChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryBright,
  },
  objectionText: {
    fontSize: 10,
    color: colors.textSubtle,
    fontWeight: '600',
  },
  objectionTextActive: {
    color: colors.textWhite,
  },
  winnerBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryBright,
  },
  negIntroBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  negIntroTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textWhite,
  },
  negIntroDesc: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
  negFeedList: {
    gap: 8,
  },
  roundHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textDim,
    letterSpacing: 0.5,
  },
  agentBubble: {
    borderRadius: radii.md,
    padding: 8,
    borderWidth: 1,
    gap: 4,
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agentName: {
    fontSize: 11,
    fontWeight: '800',
  },
  advocatingText: {
    fontSize: 9,
    color: colors.textSubtle,
    fontWeight: '600',
  },
  stanceBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: radii.full,
  },
  stanceText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textWhite,
    textTransform: 'uppercase',
  },
  agentMsg: {
    fontSize: 11,
    color: colors.textSubtle,
    lineHeight: 15,
  },
  coordinatorCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(142, 224, 116, 0.4)',
    gap: 6,
    marginTop: 4,
  },
  coordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primaryBright,
  },
  coordProvider: {
    fontSize: 8,
    color: colors.textMuted,
  },
  coordWinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coordWinnerText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textWhite,
  },
  coordSummary: {
    fontSize: 11,
    color: colors.textSubtle,
    lineHeight: 15,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.redSoft,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.red,
  },
  errorCardText: {
    fontSize: 11,
    color: colors.red,
    flex: 1,
  },
});
