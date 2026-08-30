import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight, Bot, Cpu, Gauge, Leaf,
  Route, Scale, ShieldCheck, Sparkles, CheckCircle2,
  Database, Zap, Users, BrainCircuit
} from 'lucide-react';
import { Header } from '@/components/layout/Header';

const AGENTS = [
  { name: 'Speed Agent', icon: Zap, color: '#facc15', role: 'Minimizes trip duration & traffic delays' },
  { name: 'Cost Agent', icon: Scale, color: '#fb923c', role: 'Optimizes direct INR expenditure & tolls' },
  { name: 'Carbon Agent', icon: Leaf, color: '#8EE074', role: 'Quantifies granular IPCC CO₂ emissions' },
  { name: 'Active Agent', icon: Gauge, color: '#38bdf8', role: 'Champions cycling, walking & health' },
  { name: 'Coordinator', icon: Bot, color: '#c084fc', role: 'Synthesizes 2-round debate & resolves trade-offs' },
];

const TECH_SPONSORS = [
  {
    name: 'Google Gemini',
    tag: 'LLM & Multi-Agent',
    icon: Sparkles,
    color: '#38bdf8',
    desc: 'Powers 5-agent debate, objection handling & deterministic fact synthesis.',
  },
  {
    name: 'Actian VectorAI',
    tag: 'Vector Database',
    icon: Database,
    color: '#8EE074',
    desc: 'Stores & retrieves long-term semantic trip memories and commuter profiles.',
  },
  {
    name: 'Google Maps API',
    tag: 'Routing & Geocoding',
    icon: Route,
    color: '#fb923c',
    desc: 'Live multi-modal transit calculation, distance matrix & satellite mapping.',
  },
  {
    name: 'Deterministic Core',
    tag: 'Math & Safety',
    icon: ShieldCheck,
    color: '#a855f7',
    desc: 'Dual-gate utility policy: Zero LLM hallucinations on routing facts.',
  },
];

const fadeUp = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
};

export function HowItWorksPage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full flex flex-col text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#11240E] via-black to-black overflow-hidden select-none">
      <Header />

      <main className="flex-1 w-full max-w-[1550px] mx-auto px-3 sm:px-5 py-2 sm:py-2.5 flex flex-col justify-between gap-2 sm:gap-2.5 overflow-hidden">
        
        {/* Compact Header */}
        <header className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white drop-shadow-sm">
              How GreenRoute Works
            </h1>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8EE074]/15 border border-[#8EE074]/30 text-[#8EE074]">
              <Sparkles className="h-2.5 w-2.5" />
              <span>Hackathon Architecture Pitch</span>
            </span>
            <span className="hidden lg:inline text-[11px] text-white/50 border-l border-white/10 pl-3">
              5-Agent Autonomous Negotiation • Actian VectorAI Memory • Google Gemini Intelligence
            </span>
          </div>

          <button
            onClick={() => navigate('/trip')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8EE074] hover:bg-[#9DF083] text-black text-xs font-black shadow-md transition-all cursor-pointer"
          >
            <span>Launch Live Demo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </header>

        {/* Main Bento Grid: 2 Large Rows / 12-Column High-Density Layout */}
        <div className="grid grid-cols-12 gap-2 sm:gap-2.5 flex-1 min-h-0 overflow-hidden">
          
          {/* CARD 1: 5-AGENT NEGOTIATION MATRIX (Col 1-7, Row 1) */}
          <motion.div
            {...fadeUp}
            className="col-span-12 lg:col-span-7 dark-glass-pane rounded-2xl p-3 sm:p-4 border border-white/15 shadow-xl backdrop-blur-xl bg-black/40 flex flex-col justify-between overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                    <span>5-Agent Multi-Agent Negotiation Architecture</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                      Round 1 & 2 Debate
                    </span>
                  </h3>
                </div>
              </div>

              <span className="text-[10px] text-white/50">Google Gemini Powered</span>
            </div>

            {/* 5 Agents Row */}
            <div className="grid grid-cols-5 gap-1.5 my-1.5">
              {AGENTS.map((agent) => {
                const Icon = agent.icon;
                return (
                  <div
                    key={agent.name}
                    className="flex flex-col items-center text-center p-2 rounded-xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-colors"
                  >
                    <div
                      className="h-8 w-8 rounded-xl flex items-center justify-center mb-1 transition-transform group-hover:scale-105"
                      style={{ backgroundColor: `${agent.color}20`, border: `1px solid ${agent.color}40`, color: agent.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold text-white tracking-tight leading-tight">{agent.name}</span>
                    <span className="text-[8px] text-white/50 leading-tight mt-0.5 hidden sm:block line-clamp-2">{agent.role}</span>
                  </div>
                );
              })}
            </div>

            {/* 2-Round Execution Pipeline */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-white font-bold font-mono">Round 1</span>
                <span className="text-white/70">Competitive Advocacy</span>
              </div>
              <ArrowRight className="h-3 w-3 text-white/30" />
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded-md bg-[#8EE074]/20 text-[#8EE074] font-bold font-mono">Round 2</span>
                <span className="text-white/70">Rebuttal & Compromise</span>
              </div>
              <ArrowRight className="h-3 w-3 text-white/30" />
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold font-mono">Verdict</span>
                <span className="text-white/70">Coordinator Synthesizes Winner</span>
              </div>
            </div>
          </motion.div>

          {/* CARD 2: ACTIAN VECTORAI DB (Col 8-12, Row 1) */}
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.1 }}
            className="col-span-12 lg:col-span-5 dark-glass-pane rounded-2xl p-3 sm:p-4 border border-[#8EE074]/30 shadow-xl backdrop-blur-xl bg-black/40 flex flex-col justify-between overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-[#8EE074]/20 border border-[#8EE074]/30 flex items-center justify-center text-[#8EE074]">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    Actian VectorAI Database
                  </h3>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8EE074]/15 text-[#8EE074] font-bold border border-[#8EE074]/30">
                Track Sponsor
              </span>
            </div>

            <div className="flex flex-col gap-2 my-1">
              <p className="text-[11px] text-white/80 leading-relaxed">
                Empowers GreenRoute with <strong className="text-[#8EE074]">Long-Term Semantic Memory</strong>. Past commuter selections and preference vectors are embedded and queried via high-speed similarity search.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-0.5">
                  <span className="text-white/50 uppercase font-bold text-[8px]">Embedding Engine</span>
                  <span className="font-bold text-white">Cohere Embed v3</span>
                  <span className="text-[9px] text-[#8EE074]">1024-dim dense vectors</span>
                </div>

                <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-0.5">
                  <span className="text-white/50 uppercase font-bold text-[8px]">Vector Store</span>
                  <span className="font-bold text-white">Actian VectorAI</span>
                  <span className="text-[9px] text-[#8EE074]">gRPC Port 50051 / Local</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px] text-white/60">
              <span>Contextual Distance Band Querying</span>
              <span className="text-[#8EE074] font-bold">Zero Disruption Architecture</span>
            </div>
          </motion.div>

          {/* CARD 3: SPONSORS & TECH STACK (Col 1-5, Row 2) */}
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.15 }}
            className="col-span-12 lg:col-span-5 dark-glass-pane rounded-2xl p-3 sm:p-4 border border-white/15 shadow-xl backdrop-blur-xl bg-black/40 flex flex-col justify-between overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    Sponsors & Technology Stack
                  </h3>
                </div>
              </div>
              <span className="text-[10px] text-white/40">Production Stack</span>
            </div>

            <div className="grid grid-cols-2 gap-2 my-1">
              {TECH_SPONSORS.map((tech) => {
                const Icon = tech.icon;
                return (
                  <div key={tech.name} className="p-2 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Icon className="h-3 w-3" style={{ color: tech.color }} />
                        <span className="text-[11px] font-bold text-white">{tech.name}</span>
                      </div>
                    </div>
                    <span className="text-[8.5px] uppercase font-bold tracking-wider" style={{ color: tech.color }}>
                      {tech.tag}
                    </span>
                    <span className="text-[9px] text-white/60 leading-tight line-clamp-2 mt-0.5">
                      {tech.desc}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px] text-white/60">
              <span>FastAPI Backend • React 19 Frontend</span>
              <span className="text-[#8EE074] font-semibold">100% Type Safe</span>
            </div>
          </motion.div>

          {/* CARD 4: DETERMINISTIC DUAL-GATE POLICY (Col 6-12, Row 2) */}
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.2 }}
            className="col-span-12 lg:col-span-7 dark-glass-pane rounded-2xl p-3 sm:p-4 border border-white/15 shadow-xl backdrop-blur-xl bg-black/40 flex flex-col justify-between overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                    <span>Deterministic Dual-Gate Policy</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      Zero Hallucination
                    </span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-[#8EE074] font-bold">
                <CheckCircle2 className="h-3 w-3" />
                <span>Math Before AI</span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 items-center my-1">
              {/* Formula Panel */}
              <div className="col-span-7 flex flex-col gap-1.5 bg-black/50 p-2.5 rounded-xl border border-white/10 font-mono text-[10px]">
                <span className="text-white/40 text-[9px] font-sans font-bold uppercase tracking-wider">
                  Utility Evaluation Formula
                </span>
                <div className="text-[#8EE074] font-bold">
                  utility = w_time·(1 - t/t_max) + w_cost·(1 - c/c_max) + w_co2·(1 - e/e_max)
                </div>
                <div className="text-white/70 text-[9px] pt-1 border-t border-white/10">
                  Gate Threshold: ΔUtility ≥ 0.15 AND (ΔTime &gt; 5m OR ΔCost &gt; ₹15 OR ΔCO₂ &gt; 100g)
                </div>
              </div>

              {/* Mobility Cooperation Feature */}
              <div className="col-span-5 flex flex-col gap-1.5 bg-white/5 p-2.5 rounded-xl border border-white/10">
                <div className="flex items-center gap-1 text-[#8EE074] text-[11px] font-bold">
                  <Users className="h-3.5 w-3.5" />
                  <span>Mobility Cooperation</span>
                </div>
                <p className="text-[9.5px] text-white/70 leading-tight">
                  Dynamic commuter matching: Finds shared corridors and transit hub relays across Coimbatore & Chennai to take vehicles off the road.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px] text-white/60">
              <span>Traffic Surge Ingestion via OSRM Customization</span>
              <span className="text-white">Live WeatherStack AQI Integration</span>
            </div>
          </motion.div>

        </div>

      </main>
    </div>
  );
}
