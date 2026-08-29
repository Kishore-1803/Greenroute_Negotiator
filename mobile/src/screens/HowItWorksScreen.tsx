import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowRight,
  Bot,
  Clock,
  Compass,
  Cpu,
  Gauge,
  IndianRupee,
  Leaf,
  Lightbulb,
  RefreshCw,
  Route,
  Scale,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';
import { colors, radii } from '../theme/tokens';
import { GlassCard } from '../components/common/GlassCard';
import { Button } from '../components/common/Button';
import { Header } from '../components/common/Header';

const PIPELINE_STAGES = [
  { num: '01', title: 'Route', icon: Compass },
  { num: '02', title: 'Traffic', icon: Gauge },
  { num: '03', title: 'Recompute', icon: RefreshCw },
  { num: '04', title: 'Compare', icon: Scale },
  { num: '05', title: 'Gate', icon: ShieldCheck, highlight: true },
  { num: '06', title: 'Explain', icon: Lightbulb, isLast: true },
];

const DATA_SOURCES = [
  { icon: Route, label: 'OSRM Engine', status: 'Live' },
  { icon: Gauge, label: 'Traffic Surge', status: 'Simulated' },
  { icon: Leaf, label: 'Emissions', status: 'ICCT Data' },
];

const TRANSPARENCY = [
  { label: 'Decision Engine', value: 'Deterministic' },
  { label: 'Explanation', value: 'Grounded AI' },
  { label: 'Car/Bike Routes', value: 'Real OSRM' },
];

export const HowItWorksScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <ImageBackground
      source={require('../../assets/home.png')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.darkOverlay}>
        <Header currentRouteName="HowItWorks" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card 1: Hero & CTA */}
          <GlassCard style={styles.heroCard} variant="light">
            <View style={styles.badgeRow}>
              <Sparkles size={12} color={colors.primaryBright} />
              <Text style={styles.badgeText}>ARCHITECTURE</Text>
            </View>

            <Text style={styles.heroTitle}>
              Your route stays the same.{'\n'}
              <Text style={styles.heroAccent}>The decision doesn't.</Text>
            </Text>

            <Button
              title="Launch Trip Workspace"
              onPress={() => navigation.navigate('TripWorkspace')}
              variant="primary"
              icon={<ArrowRight size={14} color={colors.textDark} />}
              style={styles.launchBtn}
            />
          </GlassCard>

          {/* Card 2: Pipeline Execution */}
          <GlassCard style={styles.sectionCard} variant="dark">
            <Text style={styles.cardSectionTitle}>PIPELINE EXECUTION</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pipelineRow}
            >
              {PIPELINE_STAGES.map((stage, idx) => {
                const Icon = stage.icon;
                return (
                  <View key={stage.num} style={styles.pipelineItemWrap}>
                    <View
                      style={[
                        styles.pipelineItem,
                        stage.highlight && styles.pipelineItemHighlight,
                        stage.isLast && styles.pipelineItemLast,
                      ]}
                    >
                      <Icon
                        size={18}
                        color={
                          stage.highlight
                            ? colors.primaryBright
                            : stage.isLast
                            ? colors.purple
                            : colors.textWhite
                        }
                      />
                      <Text style={styles.stageTitle}>{stage.title}</Text>
                    </View>
                    {idx < PIPELINE_STAGES.length - 1 && (
                      <ArrowRight size={12} color="rgba(255, 255, 255, 0.2)" />
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </GlassCard>

          {/* Card 3: Deterministic Engine Dual Gate */}
          <GlassCard style={styles.sectionCard} variant="dark">
            <View style={styles.headerRow}>
              <View style={styles.headerTitleRow}>
                <Cpu size={16} color={colors.primaryBright} />
                <Text style={styles.engineTitle}>DETERMINISTIC ENGINE</Text>
              </View>
              <Text style={styles.codeTag}>Code / Math</Text>
            </View>

            <Text style={styles.engineDesc}>
              The decision to switch modes is calculated deterministically using a{' '}
              <Text style={{ color: colors.primaryBright, fontWeight: '700' }}>
                dual-gate policy
              </Text>{' '}
              before any AI prompt is built.
            </Text>

            <View style={styles.formulaBox}>
              <Text style={styles.formulaHighlight}>
                utility = 0.45(time) + 0.30(cost) + 0.25(co2)
              </Text>
              <Text style={styles.formulaCode}>gate = util_diff &gt;= 0.15</Text>
              <Text style={styles.formulaCode}>
                AND (time &gt; 5m OR cost &gt; ₹15 OR co2 &gt; 100g)
              </Text>
            </View>

            <View style={styles.metricExtractionList}>
              <View style={styles.extractItem}>
                <Clock size={14} color={colors.primaryBright} />
                <Text style={styles.extractText}>Extract Time from OSRM</Text>
              </View>
              <View style={styles.extractItem}>
                <IndianRupee size={14} color={colors.primaryBright} />
                <Text style={styles.extractText}>Calculate Direct Operating Cost</Text>
              </View>
              <View style={styles.extractItem}>
                <Leaf size={14} color={colors.primaryBright} />
                <Text style={styles.extractText}>Quantify Verified CO₂ Emissions</Text>
              </View>
            </View>
          </GlassCard>

          {/* Card 4: Grounded AI Layer */}
          <GlassCard style={styles.sectionCard} variant="dark">
            <View style={styles.headerRow}>
              <View style={styles.headerTitleRow}>
                <Bot size={16} color={colors.purple} />
                <Text style={[styles.engineTitle, { color: colors.purple }]}>
                  GROUNDED AI LAYER
                </Text>
              </View>
              <Text style={styles.aiTag}>LLM</Text>
            </View>

            <Text style={styles.aiDesc}>
              AI explains the decision, but cannot make or alter it. The calculated metrics are passed as locked variables to ensure zero hallucination of facts.
            </Text>

            <View style={styles.objectionHighlightBox}>
              <CheckCircle2 size={16} color={colors.purple} />
              <Text style={styles.objectionHighlightText}>Calm Objection Handling Built-In</Text>
            </View>
          </GlassCard>

          {/* Card 5: Transparency & Data Sources */}
          <GlassCard style={styles.sectionCard} variant="dark">
            <Text style={styles.cardSectionTitle}>TRANSPARENCY & DATA</Text>

            <View style={styles.transparencyGrid}>
              <View style={styles.transparencyCol}>
                <Text style={styles.colHeader}>DATA SOURCES</Text>
                {DATA_SOURCES.map((src) => {
                  const Icon = src.icon;
                  return (
                    <View key={src.label} style={styles.sourceItem}>
                      <View style={styles.sourceItemLeft}>
                        <Icon size={12} color="rgba(255, 255, 255, 0.6)" />
                        <Text style={styles.sourceLabel}>{src.label}</Text>
                      </View>
                      <Text style={styles.sourceStatus}>{src.status}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={[styles.transparencyCol, styles.transparencyColBorder]}>
                <Text style={styles.colHeader}>TRANSPARENCY</Text>
                {TRANSPARENCY.map((t) => (
                  <View key={t.label} style={styles.sourceItem}>
                    <Text style={styles.sourceLabel}>{t.label}</Text>
                    <Text style={styles.transValue}>{t.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </GlassCard>
        </ScrollView>
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
    paddingBottom: 40,
    gap: 14,
  },
  heroCard: {
    gap: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgeText: {
    color: colors.primaryBright,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textWhite,
    lineHeight: 26,
  },
  heroAccent: {
    color: colors.primaryBright,
  },
  launchBtn: {
    marginTop: 4,
  },
  sectionCard: {
    gap: 12,
  },
  cardSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textDim,
    letterSpacing: 0.8,
  },
  pipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  pipelineItemWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pipelineItem: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  pipelineItemHighlight: {
    backgroundColor: colors.primarySoft,
    borderColor: 'rgba(142, 224, 116, 0.4)',
  },
  pipelineItemLast: {
    backgroundColor: colors.purpleSoft,
    borderColor: 'rgba(192, 132, 252, 0.4)',
  },
  stageTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textWhite,
    textTransform: 'uppercase',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engineTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primaryBright,
    letterSpacing: 0.5,
  },
  codeTag: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.sm,
  },
  engineDesc: {
    fontSize: 12,
    color: colors.textSubtle,
    lineHeight: 18,
  },
  formulaBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  formulaHighlight: {
    color: colors.primaryBright,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
  },
  formulaCode: {
    color: colors.textMuted,
    fontFamily: 'monospace',
    fontSize: 10,
  },
  metricExtractionList: {
    gap: 8,
  },
  extractItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  extractText: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: '500',
  },
  aiTag: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.purple,
    backgroundColor: colors.purpleSoft,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.sm,
  },
  aiDesc: {
    fontSize: 12,
    color: colors.textSubtle,
    lineHeight: 17,
  },
  objectionHighlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.25)',
  },
  objectionHighlightText: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: '600',
  },
  transparencyGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  transparencyCol: {
    flex: 1,
    gap: 8,
  },
  transparencyColBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    paddingLeft: 12,
  },
  colHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textDim,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sourceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceLabel: {
    color: colors.textWhite,
    fontSize: 11,
  },
  sourceStatus: {
    color: colors.textDim,
    fontSize: 10,
  },
  transValue: {
    color: colors.primaryBright,
    fontSize: 10,
    fontWeight: '700',
  },
});
