import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

// Below this, a recording is a stray tap rather than speech. The backend rejects short clips
// too (speech recognisers hallucinate confident filler from near-silence), but catching it here
// saves the user a round trip and an error they'd have to read.
const MIN_RECORDING_MS = 400;

export interface VoiceRecorder {
  /** True from the moment the mic actually starts capturing, not from the moment it was asked to. */
  isRecording: boolean;
  /** Live input level 0..1 while recording -- drives the orb's pulse so the user can see it hears them. */
  metering: number;
  /** Permission was asked for and refused. The UI stops offering the mic and explains why. */
  permissionDenied: boolean;
  error: string | null;
  start: () => Promise<void>;
  /** Returns the recorded file's URI, or null if the take was too short or failed. */
  stop: () => Promise<string | null>;
}

/**
 * Press-and-hold microphone capture.
 *
 * Owns permissions, the audio session, and the too-short-to-be-speech rule; it knows nothing
 * about transcription or trips. The screen composing it decides what the recording means.
 */
export function useVoiceRecorder(): VoiceRecorder {
  // HIGH_QUALITY records m4a/AAC, which is what the transcribe endpoint expects. Metering is on
  // so the UI can react to the user's actual voice rather than animating on a timer.
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(recorder, 100);

  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (cancelled) return;
      if (!status.granted) {
        setPermissionDenied(true);
        return;
      }
      // playsInSilentMode matters on iOS specifically: without it the spoken recommendation is
      // silently dropped when the ring switch is off, which reads as "the app is broken".
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (permissionDenied) return;

    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAtRef.current = Date.now();
    } catch (err: any) {
      setError(err?.message || 'Could not start recording.');
      startedAtRef.current = null;
    }
  }, [permissionDenied, recorder]);

  const stop = useCallback(async (): Promise<string | null> => {
    const startedAt = startedAtRef.current;
    startedAtRef.current = null;
    if (startedAt === null) return null;

    try {
      await recorder.stop();
    } catch (err: any) {
      setError(err?.message || 'Could not finish recording.');
      return null;
    }

    if (Date.now() - startedAt < MIN_RECORDING_MS) {
      setError('Hold the button while you speak.');
      return null;
    }
    return recorder.uri ?? null;
  }, [recorder]);

  return {
    isRecording: recorderState.isRecording,
    // Metering is reported in dBFS (roughly -160 silent, 0 peak). Normalising against -50dB
    // rather than the full floor keeps the orb responsive to speech instead of barely moving.
    metering: normalizeMetering(recorderState.metering),
    permissionDenied,
    error,
    start,
    stop,
  };
}

function normalizeMetering(db: number | undefined): number {
  if (db === undefined || Number.isNaN(db)) return 0;
  const floor = -50;
  if (db <= floor) return 0;
  if (db >= 0) return 1;
  return (db - floor) / -floor;
}
