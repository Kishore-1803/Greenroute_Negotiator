import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import type { TravelMode } from '@/types/mode';
import type { RouteLayerInput } from '@/features/map/route-layer';
import { useBaselineMutation } from '@/features/trip/hooks/useBaselineMutation';
import { useConditionChangeMutation } from '@/features/trip/hooks/useConditionChangeMutation';
import { useExplanationMutation } from '@/features/trip/hooks/useExplanationMutation';
import { useNegotiationMutation } from '@/features/trip/hooks/useNegotiationMutation';
import { useSelectionMutation } from '@/features/trip/hooks/useSelectionMutation';
import type { BaselineResponse, ObjectionCategory } from '@/services/api/types';
import { MOCK_LOCATIONS, type LocationPoint } from '@/lib/mockLocations';
import { getOrCreateUserId } from '@/lib/userId';
import { DecisionWorkspacePanel } from './DecisionWorkspacePanel';
import { ConditionChangeStatus } from './ConditionChangeStatus';
import { AgentNegotiationFeed } from './AgentNegotiationFeed';

const MapView = lazy(() => import('@/features/map/MapView').then((m) => ({ default: m.MapView })));

interface LocationState {
  baseline?: BaselineResponse;
}

export function TripWorkspacePage() {
  const { tripId: paramTripId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [origin, setOrigin] = useState<LocationPoint | null>(MOCK_LOCATIONS[0]);
  const [destination, setDestination] = useState<LocationPoint | null>(MOCK_LOCATIONS[1]);

  const baselineMutation = useBaselineMutation();
  const [baselineData, setBaselineData] = useState<BaselineResponse | undefined>(
    () => (location.state as LocationState | null)?.baseline
  );

  const activeTripId = baselineData?.trip_id || paramTripId;
  // Default to the system's recommendation (best_mode), not an arbitrary mode -- Master Plan
  // primary flow: the point of the baseline call is to surface a recommended winner.
  const [selectedMode, setSelectedMode] = useState<TravelMode>(
    () => ((baselineData?.best_mode ?? baselineData?.current_mode) as TravelMode) || 'car'
  );

  const conditionChange = useConditionChangeMutation(activeTripId);
  const explanation = useExplanationMutation(activeTripId);
  const negotiation = useNegotiationMutation(activeTripId);
  const selection = useSelectionMutation(activeTripId);
  const [pendingObjection, setPendingObjection] = useState<ObjectionCategory>();
  const userId = useMemo(() => getOrCreateUserId(), []);

  const phase = conditionChange.isPending
    ? 'condition_loading'
    : conditionChange.isError
      ? 'condition_error'
      : conditionChange.isSuccess
        ? 'decided'
        : baselineMutation.isPending
          ? 'baseline_loading'
          : baselineData
            ? 'baseline_ready'
            : 'planning';



  const decided = phase === 'decided';

  // Request the initial explanation automatically as soon as there is something to explain --
  // Master Plan primary flow: baseline_ready already has a recommendation (best_mode) worth a
  // "why" explanation, not just the advanced condition-change/SWITCH-STAY flow's `decided`.
  useEffect(() => {
    if ((phase === 'baseline_ready' || phase === 'decided') && explanation.status === 'idle') {
      explanation.mutate({});
    }
  }, [phase]);

  function handleFindRoute(mode: TravelMode) {
    if (!origin || !destination) return;

    setSelectedMode(mode);
    baselineMutation.mutate(
      {
        origin_lon: origin.lon,
        origin_lat: origin.lat,
        dest_lon: destination.lon,
        dest_lat: destination.lat,
        current_mode: mode,
        user_id: userId,
      },
      {
        onSuccess: (data) => {
          setBaselineData(data);
          navigate(`/trip/${data.trip_id}`, { state: { baseline: data }, replace: true });
        },
      }
    );
  }

  function handleModeChange(newMode: TravelMode) {
    if (newMode === selectedMode && baselineData) return;
    setSelectedMode(newMode);

    // Only re-fetch if we are already out of the planning phase
    if (phase !== 'planning' && origin && destination) {
      conditionChange.reset();
      explanation.reset();
      negotiation.reset();
      selection.reset();

      baselineMutation.mutate(
        {
          origin_lon: origin.lon,
          origin_lat: origin.lat,
          dest_lon: destination.lon,
          dest_lat: destination.lat,
          current_mode: newMode,
          user_id: userId,
        },
        {
          onSuccess: (data) => {
            setBaselineData(data);
            navigate(`/trip/${data.trip_id}`, { state: { baseline: data }, replace: true });
          },
        }
      );
    }
  }

  function handleConfirmSelection(mode: TravelMode) {
    selection.mutate({ selected_mode: mode });
  }

  function handleObjection(category: ObjectionCategory) {
    setPendingObjection(category);
    explanation.mutate(
      { objection_category: category },
      { onSettled: () => setPendingObjection(undefined) }
    );
  }

  // Real GeoJSON route geometry layers from backend
  const mapRoutes = useMemo<RouteLayerInput[]>(() => {
    if (!baselineData) return [];

    if (decided && conditionChange.data) {
      const { after, switch_decision } = conditionChange.data;
      const primaryMode =
        switch_decision.decision === 'SWITCH'
          ? switch_decision.recommended_mode
          : switch_decision.current_mode;

      const routes: RouteLayerInput[] = after.modes
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
  }, [baselineData, decided, conditionChange.data, selectedMode]);



  return (
    <div className="flex-1 w-full flex flex-col p-2 sm:p-3.5 gap-2.5 max-w-[1720px] mx-auto select-none">
      {/* Main 12-Column Responsive Workspace: Decision Panel (4 cols, ~33%) + Map (8 cols, ~67%) */}
      <div className="flex-1 min-h-[800px] lg:min-h-[600px] grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3.5 items-stretch">
        
        {/* Decision Panel: One Unified Decision Workspace (4 Columns / 12 on Desktop) */}
        <div className="lg:col-span-4 h-full min-h-0 flex flex-col overflow-hidden order-last lg:order-first">
          <DecisionWorkspacePanel
            selectedMode={selectedMode}
            onSelectMode={handleModeChange}
            onFindRoute={handleFindRoute}
            origin={origin}
            destination={destination}
            onChangeOrigin={setOrigin}
            onChangeDestination={setDestination}
            baselineData={baselineData}
            conditionData={conditionChange.data}
            phase={phase}
            explanationData={explanation.data}
            explanationStatus={
              explanation.status === 'idle' || explanation.isPending
                ? 'loading'
                : explanation.isError
                  ? 'error'
                  : 'success'
            }
            explanationError={explanation.error ?? undefined}
            pendingObjection={pendingObjection}
            onSimulateSurge={() => {
              // Reset so the auto-explain effect fires again once the surge produces a fresh
              // SWITCH/STAY decision -- otherwise the baseline's RECOMMEND explanation (already
              // fetched, status no longer 'idle') would just sit there unexplained-for-the-new-
              // decision until the user manually clicks Retry.
              explanation.reset();
              conditionChange.mutate();
            }}
            onRetryExplanation={() => explanation.mutate({})}
            onObjection={handleObjection}
            onConfirmSelection={handleConfirmSelection}
            selectionResult={selection.data}
            selectionStatus={selection.status}
          />
        </div>
        <main
          aria-label="Interactive Route Map"
          className="lg:col-span-5 h-full min-h-[300px] flex flex-col rounded-2xl dark-glass-pane p-1 border border-white/20 shadow-xl overflow-hidden relative"
        >
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center text-xs text-white/70">
                <RefreshCw className="h-4 w-4 animate-spin text-[#8EE074] mr-2" />
                <span>Loading route map…</span>
              </div>
            }
          >
            <MapView routes={mapRoutes} className="h-full w-full rounded-xl" />
          </Suspense>

          {/* Condition Loading Overlay over Map */}
          {phase === 'condition_loading' && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-20">
              <ConditionChangeStatus />
            </div>
          )}
        </main>

        {/* Agent Negotiation Feed (3 Columns / 12 on Desktop) */}
        <div className="lg:col-span-3 h-full min-h-[300px] flex flex-col overflow-hidden rounded-2xl dark-glass-pane p-4 border border-white/20 shadow-xl bg-black/20">
          <AgentNegotiationFeed
            negotiation={negotiation.data}
            status={negotiation.isPending ? 'loading' : negotiation.isError ? 'error' : negotiation.isSuccess ? 'success' : 'idle'}
            error={negotiation.error ?? undefined}
            onRun={() => negotiation.mutate()}
          />
        </div>
      </div>
    </div>
  );
}




