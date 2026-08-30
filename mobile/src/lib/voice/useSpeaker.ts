import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

export interface Speaker {
  isSpeaking: boolean;
  /**
   * Speaks `script`. Plays `audioUrl` (ElevenLabs) when one is supplied, and falls back to the
   * device's own engine if that playback fails for any reason -- a network hiccup on the audio
   * fetch should cost the user the nicer voice, never the recommendation itself.
   */
  speak: (script: string, audioUrl?: string | null) => Promise<void>;
  stop: () => void;
}

export function useSpeaker(): Speaker {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  // Guards against a stale clip finishing after the user has started a new request: without it,
  // an old playback's completion handler would clear the flag mid-way through the new one.
  const generationRef = useRef(0);

  const releasePlayer = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.remove();
      playerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    generationRef.current += 1;
    Speech.stop();
    releasePlayer();
    setIsSpeaking(false);
  }, [releasePlayer]);

  useEffect(() => stop, [stop]);

  const speakOnDevice = useCallback((script: string, generation: number) => {
    return new Promise<void>((resolve) => {
      const finish = () => {
        if (generationRef.current === generation) setIsSpeaking(false);
        resolve();
      };
      Speech.speak(script, {
        // Slightly under default: this reads out minutes, rupees and gram figures, and the
        // stock rate runs them together.
        rate: 0.95,
        pitch: 1.0,
        onDone: finish,
        onStopped: finish,
        onError: finish,
      });
    });
  }, []);

  const speak = useCallback(
    async (script: string, audioUrl?: string | null) => {
      stop();
      const generation = generationRef.current;
      setIsSpeaking(true);

      if (!audioUrl) {
        await speakOnDevice(script, generation);
        return;
      }

      try {
        const player = createAudioPlayer({ uri: audioUrl });
        playerRef.current = player;
        player.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish && generationRef.current === generation) {
            setIsSpeaking(false);
            releasePlayer();
          }
        });
        player.play();
      } catch {
        // The synthesized clip could not be played (expired, unreachable, unsupported). The
        // script is already grounded text, so the device can just read it.
        releasePlayer();
        await speakOnDevice(script, generation);
      }
    },
    [releasePlayer, speakOnDevice, stop]
  );

  return { isSpeaking, speak, stop };
}
