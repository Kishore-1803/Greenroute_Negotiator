import { useCallback, useMemo, useRef, useState } from 'react';
import { voiceApi } from '../../services/api/voice';
import { tripsApi } from '../../services/api/trips';
import type { LocationPoint } from '../mockLocations';
import type {
  BaselineResponse,
  StatedPriority,
  VoiceInterpretResponse,
} from '../../services/api/types';
import { useVoiceRecorder } from './useVoiceRecorder';
import { useSpeaker } from './useSpeaker';
import { useAppSettings } from '../appSettings';

/**
 * The stages one spoken command passes through, in order. Surfaced to the UI as a checklist so
 * the user can see where a slow or failed run actually got to -- "it didn't work" is a much
 * worse answer than "it heard you, but couldn't find that place".
 */
export const VOICE_STAGES = ['listening', 'transcribing', 'understanding', 'routing', 'speaking'] as const;
export type VoiceStage = (typeof VOICE_STAGES)[number];

export type StageStatus = 'pending' | 'active' | 'done' | 'failed';

export const STAGE_LABELS: Record<VoiceStage, string> = {
  listening: 'Listening',
  transcribing: 'Understanding your words',
  understanding: 'Finding the place',
  routing: 'Comparing your options',
  speaking: 'Telling you the plan',
};

export interface VoiceTripResult {
  baseline: BaselineResponse;
  origin: LocationPoint;
  destination: LocationPoint;
}

export interface VoiceTripFlow {
  active: boolean;
  stage: VoiceStage | null;
  statusOf: (stage: VoiceStage) => StageStatus;
  isRecording: boolean;
  metering: number;
  permissionDenied: boolean;
  /** What the user was heard to say, shown as soon as it is known. */
  transcript: string | null;
  interpretation: VoiceInterpretResponse | null;
  /** The spoken recommendation's text, so it can be read as well as heard. */
  script: string | null;
  /** A recoverable "say that again" message, distinct from a hard error. */
  clarification: string | null;
  error: string | null;
  isSpeaking: boolean;
  beginListening: () => Promise<void>;
  /** Releases the mic and runs the rest of the pipeline. Resolves with the trip, or null. */
  finishAndRun: () => Promise<VoiceTripResult | null>;
  cancel: () => void;
  replay: () => void;
}

interface Options {
  /** Null while device storage resolves the id. The mic is disabled until it lands, rather than
   * attributing a trip to a placeholder that would train the wrong preferences. */
  userId: string | null;
  /** The device's GPS fix, used as the trip's origin when the user names no starting point. */
  deviceLocation: LocationPoint | null;
}

export function useVoiceTripFlow({ userId, deviceLocation }: Options): VoiceTripFlow {
  const recorder = useVoiceRecorder();
  const speaker = useSpeaker();
  const { settings } = useAppSettings();

  const [stage, setStage] = useState<VoiceStage | null>(null);
  const [completed, setCompleted] = useState<VoiceStage[]>([]);
  const [failedStage, setFailedStage] = useState<VoiceStage | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<VoiceInterpretResponse | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [clarification, setClarification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Kept for replay() so the user can hear the recommendation again without re-synthesizing it.
  const lastAudioUrlRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setCompleted([]);
    setFailedStage(null);
    setTranscript(null);
    setInterpretation(null);
    setScript(null);
    setClarification(null);
    setError(null);
    lastAudioUrlRef.current = null;
  }, []);

  const beginListening = useCallback(async () => {
    speaker.stop();
    reset();
    setStage('listening');
    await recorder.start();
  }, [recorder, reset, speaker]);

  const cancel = useCallback(() => {
    speaker.stop();
    setStage(null);
    reset();
  }, [reset, speaker]);

  const replay = useCallback(() => {
    if (script) speaker.speak(script, lastAudioUrlRef.current);
  }, [script, speaker]);

  const finishAndRun = useCallback(async (): Promise<VoiceTripResult | null> => {
    const fail = (at: VoiceStage, message: string) => {
      setFailedStage(at);
      setStage(null);
      setError(message);
      return null;
    };
    // A stage the user must resolve by speaking again -- not a fault, so it gets the softer
    // treatment and is spoken back rather than shown as a red error.
    const askAgain = (at: VoiceStage, message: string) => {
      setFailedStage(at);
      setStage(null);
      setClarification(message);
      speaker.speak(message);
      return null;
    };

    const audioUri = await recorder.stop();
    if (!audioUri) {
      return fail('listening', recorder.error || 'Nothing was recorded. Hold the button while you speak.');
    }
    if (!userId) {
      return fail('listening', 'Still starting up — try again in a moment.');
    }
    setCompleted(['listening']);

    // 1. Speech -> words.
    setStage('transcribing');
    let heard: string;
    try {
      heard = (await voiceApi.transcribe(audioUri)).transcript;
      setTranscript(heard);
    } catch (err: any) {
      return fail('transcribing', err?.message || 'Could not understand that recording.');
    }
    setCompleted((prev) => [...prev, 'transcribing']);

    // 2. Words -> a destination on the map.
    setStage('understanding');
    let plan: VoiceInterpretResponse;
    try {
      plan = await voiceApi.interpret({
        transcript: heard,
        ...(deviceLocation ? { device_lon: deviceLocation.lon, device_lat: deviceLocation.lat } : {}),
      });
      setInterpretation(plan);
    } catch (err: any) {
      return fail('understanding', err?.message || 'Could not work out where you want to go.');
    }

    if (plan.clarification || !plan.destination || !plan.origin) {
      return askAgain(
        'understanding',
        plan.clarification || "I didn't catch where you want to go. Try \"take me to Anna Nagar\"."
      );
    }
    setCompleted((prev) => [...prev, 'understanding']);

    const origin: LocationPoint = { id: 'voice_origin', ...plan.origin };
    const destination: LocationPoint = { id: 'voice_destination', ...plan.destination };

    // 3. Route and score the three modes -- the same call the typed planner makes, so a spoken
    // trip and a tapped one produce identical numbers.
    setStage('routing');
    let baseline: BaselineResponse;
    try {
      baseline = await tripsApi.baseline({
        origin_lon: origin.lon,
        origin_lat: origin.lat,
        dest_lon: destination.lon,
        dest_lat: destination.lat,
        user_id: userId,
        ...(plan.stated_priority ? { stated_priority: plan.stated_priority as StatedPriority } : {}),
      });
    } catch (err: any) {
      return fail('routing', err?.message || 'Could not work out a route for that trip.');
    }
    setCompleted((prev) => [...prev, 'routing']);

    // 4. Say the recommendation out loud. Narration failing must not sink a trip that has
    // already been computed -- the user still gets the screen, just without the voice.
    setStage('speaking');
    try {
      const narration = await voiceApi.narrate({
        trip_id: baseline.trip_id,
        destination_label: destination.label,
        ...(plan.stated_priority ? { spoken_priority: plan.stated_priority as StatedPriority } : {}),
      });
      setScript(narration.script);
      lastAudioUrlRef.current = narration.speech_url ? voiceApi.speechUrl(narration.speech_url) : null;
      // With narration muted the script is still fetched and shown -- the recommendation text
      // is the useful part, and "Hear it again" stays available for a one-off listen.
      if (settings.spokenRecommendations) {
        speaker.speak(narration.script, lastAudioUrlRef.current);
      }
    } catch {
      setScript(null);
    }
    setCompleted((prev) => [...prev, 'speaking']);
    setStage(null);

    return { baseline, origin, destination };
  }, [deviceLocation, recorder, settings.spokenRecommendations, speaker, userId]);

  const statusOf = useCallback(
    (target: VoiceStage): StageStatus => {
      if (failedStage === target) return 'failed';
      if (completed.includes(target)) return 'done';
      if (stage === target) return 'active';
      return 'pending';
    },
    [completed, failedStage, stage]
  );

  const active = useMemo(
    () => stage !== null || completed.length > 0 || failedStage !== null,
    [completed.length, failedStage, stage]
  );

  return {
    active,
    stage,
    statusOf,
    isRecording: recorder.isRecording,
    metering: recorder.metering,
    permissionDenied: recorder.permissionDenied,
    transcript,
    interpretation,
    script,
    clarification,
    error,
    isSpeaking: speaker.isSpeaking,
    beginListening,
    finishAndRun,
    cancel,
    replay,
  };
}
