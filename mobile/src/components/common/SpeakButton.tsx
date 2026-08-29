import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Volume2, AudioLines } from 'lucide-react-native';
import { colors, radii } from '../../theme/tokens';
import { getSpeechStatus, narrate } from '../../services/api/speech';

interface SpeakButtonProps {
  /** Backend-produced text to narrate (a Coordinator summary, a grounded explanation). */
  text: string | undefined | null;
  label?: string;
}

let cachedEnabled: boolean | null = null;

export const SpeakButton: React.FC<SpeakButtonProps> = ({ text, label }) => {
  const [enabled, setEnabled] = useState<boolean | null>(cachedEnabled);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (cachedEnabled !== null) return;
    getSpeechStatus()
      .then((s) => {
        cachedEnabled = s.enabled;
        setEnabled(s.enabled);
      })
      .catch(() => {
        cachedEnabled = false;
        setEnabled(false);
      });
  }, []);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const cleaned = text?.trim();
  if (!enabled || !cleaned) return null;

  async function handlePress() {
    if (playing) {
      await soundRef.current?.stopAsync();
      setPlaying(false);
      return;
    }
    setLoading(true);
    try {
      const dataUri = await narrate(cleaned!);
      await soundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        { uri: dataUri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlaying(false);
        }
      });
    } catch {
      // Quiet fail -- narration is a nice-to-have, never blocks the core flow.
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={loading}
      style={[styles.btn, playing && styles.btnActive]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primaryBright} />
      ) : playing ? (
        <AudioLines size={12} color={colors.primaryBright} />
      ) : (
        <Volume2 size={12} color={colors.textMuted} />
      )}
      {label && <Text style={[styles.label, playing && styles.labelActive]}>{playing ? 'Stop' : label}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  btnActive: {
    borderColor: 'rgba(142, 224, 116, 0.5)',
    backgroundColor: 'rgba(142, 224, 116, 0.12)',
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.primaryBright,
  },
});
