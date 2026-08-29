import { CheckCircle2, RefreshCw, ThumbsUp, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MODE_LABEL, TRAVEL_MODES, type TravelMode } from '@/types/mode';
import { formatCarbon, formatCost, formatDistance, formatMinutes } from '@/lib/formatMetrics';
import type {
  BaselineResponse,
  ConditionChangeResponse,
  CooperationResponse,
  ExplanationResponse,
  ObjectionCategory,
  SelectionResponse,
} from '@/services/api/types';
import { OBJECTION_CATEGORIES } from '@/services/api/types';
import { ModeIcon } from '@/components/ui/ModeIcon';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { LocationAutocomplete } from '@/features/map/components/LocationAutocomplete';
import { type LocationPoint } from '@/lib/mockLocations';
import { cn } from '@/lib/cn';
import { AgentAdjustmentTrail } from './AgentAdjustmentTrail';

const OBJECTION_LABELS: Record<ObjectionCategory, string> = {
  why_switch: 'Why switch?',
  why_stay: 'Why stay?',
  what_changed: 'What changed?',
  is_traffic_real: 'Is traffic real?',
  are_emissions_exact: 'Are emissions exact?',
  why_this_mode: 'Why this mode?',
};

export interface DecisionWorkspacePanelProps {
  selectedMode: TravelMode;
  onSelectMode: (mode: TravelMode) => void;
  onFindRoute: (mode: TravelMode) => void;
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  onChangeOrigin: (loc: LocationPoint) => void;
  onChangeDestination: (loc: LocationPoint) => void;
  baselineData?: BaselineResponse;
  conditionData?: ConditionChangeResponse;
  phase: 'planning' | 'baseline_loading' | 'baseline_ready' | 'condition_loading' | 'condition_error' | 'decided';
  explanationData?: ExplanationResponse;
  explanationStatus: 'idle' | 'loading' | 'success' | 'error';
  explanationError?: Error;
  pendingObjection?: ObjectionCategory;
  onSimulateSurge?: () => void;
  onRetryExplanation: () => void;
  onObjection: (category: ObjectionCategory) => void;
  onConfirmSelection: (mode: TravelMode, cooperationUsed?: boolean) => void;
  selectionResult?: SelectionResponse;
  selectionStatus: 'idle' | 'pending' | 'error' | 'success';
  cooperationData?: CooperationResponse;
  cooperationStatus?: 'idle' | 'pending' | 'error' | 'success';
  onFindCooperation?: () => void;
  isNegotiating?: boolean;
}

export function DecisionWorkspacePanel({
  selectedMode,
  onSelectMode,
  onFindRoute,
  origin,
  destination,
  onChangeOrigin,
  onChangeDestination,
  baselineData,
  conditionData,
  phase,
  explanationData,
  explanationStatus,
  explanationError,
  pendingObjection,
  onRetryExplanation,
  onObjection,
  onConfirmSelection,
  selectionResult,
  selectionStatus,
  cooperationData,
  cooperationStatus,
  onFindCooperation,
  isNegotiating,
}: DecisionWorkspacePanelProps) {
  const isPlanning = phase === 'planning';
  const isBaselineLoading = phase === 'baseline_loading';
  const decided = phase === 'decided' && conditionData !== undefined;
  const isSurgeLoading = phase === 'condition_loading';

  // Baseline metrics for selected mode
  const currentBaselineMode = baselineData?.modes.find((m) => m.mode === selectedMode) || baselineData?.modes[0];
  const afterSelected = conditionData?.after.modes.find((m) => m.mode === selectedMode);



  // After scenario metrics
  const decision = conditionData?.switch_decision;
  const afterRecommendedMode = decision?.recommended_mode
    ? conditionData?.after.modes.find((m) => m.mode === decision.recommended_mode)
    : undefined;

  return (
    <aside
      aria-label="Trip decision and route analysis"
      className="dark-glass-pane rounded-2xl p-4 sm:p-5 flex flex-col gap-4 h-full min-h-0 overflow-y-auto shadow-2xl border border-white/20 select-text"
    >
      {/* 1. Route Planner */}
      <section className="flex flex-col gap-3 pb-4 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Route Planner</span>
        </div>

        <div className="flex flex-col gap-2">
          {/* Editable From/To Autocomplete */}
          <div className="flex flex-col gap-1.5 relative">
            <div className="absolute left-2.5 top-4 bottom-4 w-[2px] bg-white/10" />
            <div className="flex items-center gap-3 relative z-20">
              <div className="w-2 h-2 rounded-full bg-white ml-2 shrink-0 z-10" />
              <div className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs border border-white/10 flex items-center gap-2 focus-within:border-white/30 focus-within:bg-white/10 transition-all">
                <span className="text-white/40 font-medium shrink-0">From</span>
                <LocationAutocomplete
                  value={origin}
                  onChange={onChangeOrigin}
                  placeholder="Select origin..."
                  disabled={isBaselineLoading || isSurgeLoading}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-2 h-2 rounded-full bg-[#8EE074] ml-2 shrink-0 z-10" />
              <div className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs border border-white/10 flex items-center gap-2 focus-within:border-[#8EE074]/30 focus-within:bg-[#8EE074]/10 transition-all">
                <span className="text-white/40 font-medium shrink-0">To</span>
                <LocationAutocomplete
                  value={destination}
                  onChange={onChangeDestination}
                  placeholder="Select destination..."
                  disabled={isBaselineLoading || isSurgeLoading}
                />
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          <button
            type="button"
            disabled={isBaselineLoading || isSurgeLoading || !origin || !destination}
            onClick={() => onFindRoute('car')}
            className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-[#8EE074] hover:bg-[#7ED064] text-[#1A2F16] py-2.5 px-4 text-xs font-extrabold transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBaselineLoading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Computing Route…</span>
              </>
            ) : isPlanning ? (
              <span>Find Best Route</span>
            ) : (
              <span>Recalculate Route</span>
            )}
          </button>
        </div>
      </section>

      {!isPlanning && isNegotiating && (
        <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center gap-3 bg-white/5 rounded-xl border border-white/10 p-6 animate-pulse mt-2">
          <div className="relative">
            <RefreshCw className="h-6 w-6 text-[#8EE074] animate-spin" />
            <div className="absolute inset-0 bg-[#8EE074] blur-xl opacity-20 rounded-full animate-pulse" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">AI Agents Negotiating</h3>
            <p className="text-xs text-white/50 mt-1">Specialist agents are debating the optimal route based on Speed, Cost, Carbon, and Weather.</p>
          </div>
        </div>
      )}

      {!isPlanning && !isNegotiating && (
        <>

      {/* 2. Route Comparison -- Master Plan Section 6: all three modes side by side, with
          normalized utility scores, not just the winner. Selecting a card here previews that
          mode (feeds the map + the rest of the panel + the advanced condition-change flow). */}
      <section className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Route Comparison</span>
          {currentBaselineMode && (
            <div className="flex items-center gap-3">
              {baselineData?.weather && (
                <span className="text-[11px] font-medium flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-white/80">
                  {baselineData.weather.is_raining ? '🌧️' : '⛅'} {baselineData.weather.description}, {baselineData.weather.temp_c}°C
                </span>
              )}
              <span className="text-[11px] text-white/60 font-medium">
                {formatDistance(currentBaselineMode.distance_km)}
              </span>
            </div>
          )}
        </div>

        {baselineData ? (
          <div className="flex flex-col gap-1.5">
            {TRAVEL_MODES.map((mode) => {
              const m = baselineData.modes.find((mm) => mm.mode === mode);
              const utility = baselineData.utilities[mode];
              const isRecommended = baselineData.best_mode === mode;
              const isSelected = selectedMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSelectMode(mode)}
                  disabled={isBaselineLoading || isSurgeLoading}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
                    isSelected
                      ? 'bg-[#4D7C3E]/30 border-[#8EE074]/60'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                >
                  <ModeIcon mode={mode} className="h-4 w-4 text-white/70 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-white truncate">{MODE_LABEL[mode]}</span>
                      {isRecommended && (
                        <span className="text-[8px] font-extrabold uppercase tracking-wide text-[#1A2F16] bg-[#8EE074] px-1.5 py-0.5 rounded-full shrink-0">
                          Recommended
                        </span>
                      )}
                    </div>
                    {m ? (
                      <div className="flex items-center gap-2.5 mt-0.5 text-[10px] text-white/60">
                        <span>{formatMinutes(m.duration_min)}</span>
                        <span>{formatCost(m.estimated_cost_inr)}</span>
                        <span>{formatCarbon(m.estimated_carbon_g)}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-white/40">Unavailable</span>
                    )}
                  </div>
                  {utility && (
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[9px] uppercase text-white/40">Utility</span>
                      <span className="text-xs font-bold tabular-nums text-[#8EE074]">
                        {utility.utility.toFixed(2)}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="h-14 rounded-xl bg-white/5 animate-pulse flex items-center justify-center text-xs text-white/40">
            Loading route comparison…
          </div>
        )}
      </section>

      {/* 2b. Agent Adjustments -- the Speed/Cost/Carbon agents' material step: bounded, reasoned
          adjustments to the raw route data, applied BEFORE the utility scores above are computed. */}
      {baselineData?.adjustments && (
        <AgentAdjustmentTrail adjustments={baselineData.adjustments} aqi={baselineData.aqi} />
      )}



      {/* Mobility Cooperation -- carpool / relay matching for the Car route */}
      {!isPlanning && selectedMode === 'car' && (
        <section className="flex flex-col gap-2.5 pt-3 border-t border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8EE074]">Mobility Cooperation</span>
            <div className="flex items-center gap-2">
              {onFindCooperation && cooperationStatus !== 'pending' && (
                <button
                  type="button"
                  onClick={onFindCooperation}
                  className="text-[9px] font-bold text-white/50 hover:text-[#8EE074] underline cursor-pointer"
                >
                  Re-check
                </button>
              )}
              <span className="text-[9px] text-white/50">Save CO₂ &amp; Cost</span>
            </div>
          </div>

          {cooperationStatus === 'pending' && (
            <div className="rounded-xl bg-white/5 p-3 flex items-center justify-center text-xs text-[#8EE074] gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Finding overlapping commuters…</span>
            </div>
          )}

          {cooperationStatus === 'error' && (
            <div className="rounded-xl bg-amber-500/10 p-3 border border-amber-500/20 text-xs text-amber-200">
              Unable to find cooperation candidates.
            </div>
          )}

          {cooperationStatus === 'success' && cooperationData && (
            <div className="flex flex-col gap-2">
              {cooperationData.candidates.length > 0 ? (
                cooperationData.candidates.map((cand, idx) => (
                  <div key={cand.commuter_id} className={cn('rounded-xl border border-white/20 p-3 flex flex-col gap-2', idx === 0 ? 'bg-[#4D7C3E]/20' : 'bg-white/5')}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {cand.cooperation_type === 'shared_ride' ? 'Shared Ride' : cand.cooperation_type === 'relay' ? 'Relay' : 'Shared First Leg'} with {cand.commuter_name}
                      </span>
                      <span className="text-[10px] text-[#8EE074] font-semibold">{cand.compatibility_score}% Match</span>
                    </div>
                    <p className="text-[11px] text-white/70 leading-relaxed">{cand.cooperation_narrative}</p>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase text-white/40">You Save</span>
                        <span className="text-xs font-bold text-amber-300">₹{cand.estimated_user_cost_saving_inr}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase text-white/40">Emissions Prevented</span>
                        <span className="text-xs font-bold text-[#8EE074]">{cand.estimated_carbon_saved_g}g CO₂</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-white/5 p-3 text-xs text-white/60">
                  No overlapping commuter journeys found for this route.
                </div>
              )}

              {cooperationData.negotiation && cooperationData.candidates.length > 0 && (
                <div className="mt-2 p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-2 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 border-b border-white/10 pb-1">AI Mediation</span>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-2">
                      <span className="font-semibold text-sky-400 shrink-0">You:</span>
                      <span className="text-white/80">{cooperationData.negotiation.user_position}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-amber-400 shrink-0">{cooperationData.candidates[0].commuter_name}:</span>
                      <span className="text-white/80">{cooperationData.negotiation.commuter_position}</span>
                    </div>
                    <div className="flex gap-2 mt-1 pt-1.5 border-t border-white/10">
                      <span className="font-bold text-[#8EE074] shrink-0">Deal:</span>
                      <span className="text-[#8EE074]">{cooperationData.negotiation.mediator_deal}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 4. Surge Decision -- advanced flow only: SWITCH/STAY once a condition-change has run.
          The primary-flow recommendation (best_mode) is already shown via the "Recommended"
          badge in Route Comparison above and confirmed via the selection block below. */}
      {decided && decision && (
        <section className="flex flex-col gap-2.5 pt-3 border-t border-white/10 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Surge Decision</span>

          {/* Focal Decision Card */}
          <div
            className={cn(
              'rounded-xl p-3.5 flex flex-col gap-2 border',
              decision.decision === 'SWITCH'
                ? 'bg-[#4D7C3E]/20 border-[#8EE074]/50 shadow-[0_0_20px_rgba(77,124,62,0.2)]'
                : 'bg-white/10 border-white/20 shadow-md'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#8EE074]" />
                <span className="text-xs sm:text-sm font-extrabold tracking-tight text-white uppercase">
                  {decision.decision === 'SWITCH' ? 'Switch Route / Mode' : 'Stay on Route'}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-[#8EE074] bg-black/40 px-2 py-0.5 rounded border border-[#8EE074]/30">
                Deterministic
              </span>
            </div>

            <p className="text-xs text-white/85 leading-relaxed">
              {decision.reason ||
                (decision.decision === 'SWITCH'
                  ? `Switching to ${MODE_LABEL[decision.recommended_mode as TravelMode] || decision.recommended_mode} reduces travel time and overall carbon output.`
                  : 'The current route remains more efficient under the simulated traffic conditions.')}
            </p>

            {/* Comparison Table */}
            {decision.decision === 'SWITCH' && afterSelected && afterRecommendedMode && (
              <div className="mt-1 pt-2 border-t border-white/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase text-white/50 pb-1">
                      <th className="font-semibold">Metric</th>
                      <th className="font-semibold text-white/70">Current ({MODE_LABEL[selectedMode]})</th>
                      <th className="font-semibold text-[#8EE074]">
                        Alt ({MODE_LABEL[decision.recommended_mode as TravelMode]})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="py-1 text-white/60">Time</td>
                      <td className="py-1 text-white/80">{formatMinutes(afterSelected.duration_min)}</td>
                      <td className="py-1 font-bold text-[#8EE074]">{formatMinutes(afterRecommendedMode.duration_min)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-white/60">Cost</td>
                      <td className="py-1 text-white/80">{formatCost(afterSelected.estimated_cost_inr)}</td>
                      <td className="py-1 font-bold text-[#8EE074]">{formatCost(afterRecommendedMode.estimated_cost_inr)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-white/60">CO₂</td>
                      <td className="py-1 text-white/80">{formatCarbon(afterSelected.estimated_carbon_g)}</td>
                      <td className="py-1 font-bold text-[#8EE074]">{formatCarbon(afterRecommendedMode.estimated_carbon_g)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Preference Memory feedback loop (Master Plan Section 10/22): tell the backend what the
          user actually did. Available as soon as there is a recommendation (baseline_ready) --
          not gated behind the advanced surge flow, since a fresh trip's recommendation is
          itself something the user should be able to accept or override. */}
      {baselineData && (phase === 'baseline_ready' || decided) && (
        <section className="flex flex-col gap-2.5 pt-3 border-t border-white/10 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Your Choice</span>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                {selectionStatus === 'success' ? 'Journey Recorded' : 'Ready to commute?'}
              </span>
              {selectionStatus === 'success' && selectionResult && (
                <span className="text-[10px] font-semibold text-[#8EE074] flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {selectionResult.weights_changed ? 'Preference updated' : 'Matches recommendation'}
                </span>
              )}
            </div>

            {selectionStatus === 'success' ? (
              <div className="flex flex-col gap-2.5 bg-[#8EE074]/10 border border-[#8EE074]/30 rounded-xl p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <CheckCircle2 className="h-4 w-4 text-[#8EE074]" />
                  <span>Trip completed & saved to your profile!</span>
                </div>
                <Link
                  to="/profile"
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#8EE074] hover:bg-[#7ED064] text-slate-900 font-extrabold py-2 px-3 text-xs shadow-md transition-all active:scale-[0.98]"
                >
                  <span>View in Profile & Goals</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <button
                type="button"
                disabled={selectionStatus === 'pending'}
                onClick={() => {
                  const coopUsed = selectedMode === 'car' && !!cooperationData?.candidates?.length;
                  onConfirmSelection(selectedMode, coopUsed);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8EE074]/80 to-emerald-400/80 hover:from-[#8EE074] hover:to-emerald-400 text-slate-900 font-bold py-2.5 px-3 text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                {selectionStatus === 'pending'
                  ? 'Recording Journey…'
                  : `Confirm & Complete Trip via ${MODE_LABEL[selectedMode]}`}
              </button>
            )}

            {selectionStatus === 'success' && selectionResult && (
              <PreferenceBars preference={selectionResult.preference} />
            )}
          </div>
        </section>
      )}

      {/* 5. Why this decision? AI Grounded Explanation -- available as soon as there is a
          recommendation to explain (baseline_ready = RECOMMEND, decided = SWITCH/STAY). */}
      {baselineData && (phase === 'baseline_ready' || decided) && (
        <section className="flex flex-col gap-2 pt-3 border-t border-white/10 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
              {decided ? 'Why This Decision?' : 'Why This Recommendation?'}
            </span>
            <div className="flex items-center gap-2">
              {explanationStatus === 'success' && explanationData && (
                <SpeakButton text={explanationData.summary || explanationData.reason} label="Listen" />
              )}
              <span className="text-[9px] text-white/50">AI Grounded in Backend Math</span>
            </div>
          </div>

          {explanationStatus === 'loading' && (
            <div className="rounded-xl bg-white/5 p-3 flex flex-col gap-2 text-xs text-[#8EE074]">
              <div className="flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Generating fact-grounded explanation…</span>
              </div>
              <div className="h-3 w-full bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-4/5 bg-white/10 rounded animate-pulse" />
            </div>
          )}

          {explanationStatus === 'error' && (
            <div className="rounded-xl bg-amber-500/10 p-3 border border-amber-500/20 text-xs text-amber-200 flex flex-col gap-2">
              <span>{explanationError?.message || 'Explanation temporarily unavailable.'}</span>
              <button
                type="button"
                onClick={onRetryExplanation}
                className="text-[11px] font-bold text-white underline w-fit cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {explanationStatus === 'success' && explanationData && (
            <div className="rounded-xl bg-white/5 p-3 flex flex-col gap-2 border border-white/10 text-xs text-white/85 leading-relaxed">
              <p>{explanationData.summary || explanationData.reason}</p>


            </div>
          )}

          {/* Calm Objection Questions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {OBJECTION_CATEGORIES.map((cat) => {
              const isSelected = pendingObjection === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  disabled={pendingObjection !== undefined}
                  onClick={() => onObjection(cat)}
                  className={cn(
                    'text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all cursor-pointer disabled:opacity-50',
                    isSelected
                      ? 'bg-[#4D7C3E] text-white border-[#8EE074]'
                      : 'bg-white/5 text-white/75 border-white/10 hover:bg-white/15 hover:text-white'
                  )}
                >
                  {isSelected ? 'Answering…' : OBJECTION_LABELS[cat]}
                </button>
              );
            })}
          </div>
        </section>
      )}
        </>
      )}
    </aside>
  );
}

function PreferenceBars({ preference }: { preference: SelectionResponse['preference'] }) {
  const rows: Array<{ label: string; value: number; color: string }> = [
    { label: 'Speed', value: preference.w_time, color: 'bg-sky-400' },
    { label: 'Cost', value: preference.w_cost, color: 'bg-amber-400' },
    { label: 'Carbon', value: preference.w_carbon, color: 'bg-[#8EE074]' },
  ];
  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <span className="text-[9px] uppercase tracking-wider text-white/40">
        Your learned weights · trip #{preference.trip_count}
      </span>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-[10px] text-white/60">{row.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className={cn('h-full rounded-full', row.color)} style={{ width: `${Math.round(row.value * 100)}%` }} />
          </div>
          <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-white/60">
            {Math.round(row.value * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}
