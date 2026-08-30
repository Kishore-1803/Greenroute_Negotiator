import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  AlertTriangle,
  Check,
  MapPin,
  Navigation,
  Quote,
  RotateCcw,
  Volume2,
  X,
} from 'lucide-react-native';
import { colors, radii } from '../../theme/tokens';
import {
  STAGE_LABELS,
  VOICE_STAGES,
  type StageStatus,
  type VoiceStage,
} from '../../lib/voice/useVoiceTripFlow';
import type { VoiceInterpretResponse } from '../../services/api/types';

interface Props {
  visible: boolean;
  statusOf: (stage: VoiceStage) => StageStatus;
  transcript: string | null;
  interpretation: VoiceInterpretResponse | null;
  script: string | null;
  clarification: string | null;
  error: string | null;
  isSpeaking: boolean;
  onRetry: () => void;
  onReplay: () => void;
  onClose: () => void;
}

/**
 * The step-by-step frame for one spoken command.
 *
 * Shows every stage as it happens rather than one indeterminate spinner: the pipeline crosses
 * three services and can take several seconds, and when something does go wrong, seeing which
 * stage stopped ("found the place, but couldn't route it") tells the user whether to rephrase,
 * move somewhere with signal, or just try again.
 */
export const VoiceFlowSheet: React.FC<Props> = ({
  visible,
  statusOf,
  transcript,
  interpretation,
  script,
  clarification,
  error,
  isSpeaking,
  onRetry,
  onReplay,
  onClose,
}) => {
  const blocked = Boolean(error || clarification);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Planning your trip</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {transcript ? (
            <View style={styles.quoteBox}>
              <Quote size={13} color={colors.primaryBright} />
              <Text style={styles.quoteText}>"{transcript}"</Text>
            </View>
          ) : null}

          <View style={styles.steps}>
            {VOICE_STAGES.map((stage) => (
              <StepRow key={stage} label={STAGE_LABELS[stage]} status={statusOf(stage)} />
            ))}
          </View>

          {interpretation?.origin && interpretation?.destination ? (
            <View style={styles.placesBox}>
              <PlaceRow
                icon={<MapPin size={13} color={colors.textMuted} />}
                caption="From"
                label={interpretation.origin.label}
              />
              <PlaceRow
                icon={<Navigation size={13} color={colors.primaryBright} />}
                caption="To"
                label={interpretation.destination.label}
              />
            </View>
          ) : null}

          {clarification ? (
            <View style={styles.clarifyBox}>
              <Text style={styles.clarifyText}>{clarification}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <AlertTriangle size={14} color={colors.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {script && !blocked ? (
            <View style={styles.scriptBox}>
              <View style={styles.scriptHeader}>
                <Volume2 size={13} color={colors.primaryBright} />
                <Text style={styles.scriptHeaderText}>
                  {isSpeaking ? 'Speaking…' : 'Recommendation'}
                </Text>
              </View>
              <Text style={styles.scriptText}>{script}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {blocked ? (
              <Pressable style={styles.primaryBtn} onPress={onRetry} accessibilityRole="button">
                <RotateCcw size={14} color={colors.bgDark} />
                <Text style={styles.primaryBtnText}>Try again</Text>
              </Pressable>
            ) : null}
            {script && !blocked ? (
              <Pressable style={styles.ghostBtn} onPress={onReplay} accessibilityRole="button">
                <Volume2 size={14} color={colors.primaryBright} />
                <Text style={styles.ghostBtnText}>Hear it again</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const StepRow: React.FC<{ label: string; status: StageStatus }> = ({ label, status }) => (
  <View style={styles.stepRow}>
    <View
      style={[
        styles.stepDot,
        status === 'done' && styles.stepDotDone,
        status === 'active' && styles.stepDotActive,
        status === 'failed' && styles.stepDotFailed,
      ]}
    >
      {status === 'done' ? <Check size={11} color={colors.bgDark} /> : null}
      {status === 'active' ? <ActivityIndicator size="small" color={colors.primaryBright} /> : null}
      {status === 'failed' ? <X size={11} color={colors.textWhite} /> : null}
    </View>
    <Text
      style={[
        styles.stepLabel,
        status === 'pending' && styles.stepLabelPending,
        status === 'active' && styles.stepLabelActive,
      ]}
    >
      {label}
    </Text>
  </View>
);

const PlaceRow: React.FC<{ icon: React.ReactNode; caption: string; label: string }> = ({
  icon,
  caption,
  label,
}) => (
  <View style={styles.placeRow}>
    {icon}
    <View style={styles.placeBody}>
      <Text style={styles.placeCaption}>{caption}</Text>
      <Text style={styles.placeLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(8, 16, 11, 0.6)',
  },
  sheet: {
    backgroundColor: '#132018',
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 18,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textWhite,
  },
  quoteBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(142, 224, 116, 0.25)',
    padding: 10,
  },
  quoteText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.textWhite,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  steps: {
    gap: 9,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  stepDotDone: {
    backgroundColor: colors.primaryBright,
    borderColor: colors.primaryBright,
  },
  stepDotActive: {
    backgroundColor: 'transparent',
    borderColor: colors.primaryBright,
  },
  stepDotFailed: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  stepLabel: {
    fontSize: 12.5,
    color: colors.textSubtle,
    fontWeight: '600',
  },
  stepLabelPending: {
    color: colors.textDim,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: colors.primaryBright,
    fontWeight: '700',
  },
  placesBox: {
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 10,
  },
  placeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  placeBody: {
    flex: 1,
  },
  placeCaption: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textDim,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  placeLabel: {
    fontSize: 12,
    color: colors.textWhite,
    fontWeight: '600',
    marginTop: 1,
  },
  clarifyBox: {
    backgroundColor: colors.amberSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    padding: 10,
  },
  clarifyText: {
    fontSize: 12.5,
    color: colors.amber,
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: 'row',
    gap: 7,
    backgroundColor: colors.redSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.red,
    padding: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.red,
    lineHeight: 16,
  },
  scriptBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 10,
    gap: 5,
  },
  scriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scriptHeaderText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.primaryBright,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  scriptText: {
    fontSize: 12.5,
    color: colors.textWhite,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryBright,
    borderRadius: radii.md,
    paddingVertical: 11,
  },
  primaryBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.bgDark,
  },
  ghostBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingVertical: 11,
  },
  ghostBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primaryBright,
  },
});
