import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight, Bot, Clock, Compass, Cpu, Gauge, IndianRupee, Leaf,
  Lightbulb, RefreshCw, Route, Scale, ShieldCheck, Sparkles, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/cn';

// Condensed 7-Stage Pipeline
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
  { label: 'Car/Bike', value: 'Real OSRM' },
];

const fadeUp = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

export function HowItWorksPage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">
      {/* Bento Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-3 gap-4 h-full min-h-[800px] lg:min-h-[700px] pb-10 lg:pb-0">
        
        {/* CARD 1: HERO & CTA (Col 1-4, Row 1) */}
        <motion.div {...fadeUp} className="glass-pane rounded-3xl p-6 flex flex-col justify-between lg:col-span-5 lg:row-span-1 shadow-lg border border-white/20">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 w-max text-[10px] font-bold tracking-widest text-[#8EE074] uppercase border border-white/20">
              <Sparkles className="h-3 w-3" /> Architecture
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mt-2">
              Your route stays the same.<br/>
              <span className="text-[#8EE074]">The decision doesn't.</span>
            </h1>
          </div>
          <button
            onClick={() => navigate('/trip')}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#8EE074] hover:bg-[#a0f088] px-5 py-3.5 text-sm font-bold text-[#1a2b20] shadow-md transition-colors"
          >
            Launch Trip Workspace <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        {/* CARD 2: PIPELINE (Col 5-12, Row 1) */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass-pane rounded-3xl p-6 lg:col-span-7 lg:row-span-1 shadow-lg border border-white/20 flex flex-col justify-between overflow-x-auto">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-4">Pipeline Execution</h2>
          <div className="flex items-center gap-2 min-w-max">
            {PIPELINE_STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              return (
                <div key={stage.num} className="flex items-center gap-2">
                  <div className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-colors",
                    stage.highlight ? "border-[#8EE074]/50 bg-[#8EE074]/10" : stage.isLast ? "border-purple-400/50 bg-purple-500/10" : "border-white/10 bg-white/5"
                  )}>
                    <Icon className={cn("h-5 w-5", stage.highlight ? "text-[#8EE074]" : stage.isLast ? "text-purple-300" : "text-white")} />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">{stage.title}</span>
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-white/20" />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* CARD 3: DETERMINISTIC ENGINE (Col 1-7, Row 2-3) */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="glass-pane rounded-3xl p-6 lg:col-span-7 lg:row-span-2 shadow-lg border border-white/20 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#8EE074] flex items-center gap-2">
              <Cpu className="h-4 w-4" /> Deterministic Engine
            </h2>
            <span className="text-[10px] bg-white/10 px-2 py-1 rounded-md text-white/70 border border-white/10">Code / Math</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <div className="flex flex-col justify-center gap-4">
              <p className="text-sm text-white/90 font-medium leading-relaxed">
                The decision to switch modes is calculated deterministically using a <strong className="text-[#8EE074]">dual-gate policy</strong> before any AI prompt is built.
              </p>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 font-mono text-[10px] text-white/70 space-y-2">
                <p className="text-[#8EE074]">utility = 0.45(time) + 0.30(cost) + 0.25(co2)</p>
                <p>gate = util_diff {'>'}= 0.15</p>
                <p>AND (time {'>'} 5m OR cost {'>'} ₹15 OR co2 {'>'} 100g)</p>
              </div>
            </div>
            
            <div className="flex flex-col justify-center gap-3">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <Clock className="h-4 w-4 text-[#8EE074]" /> <span className="text-xs text-white">Extract Time</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <IndianRupee className="h-4 w-4 text-[#8EE074]" /> <span className="text-xs text-white">Calculate Direct Cost</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <Leaf className="h-4 w-4 text-[#8EE074]" /> <span className="text-xs text-white">Quantify Emissions</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CARD 4: AI EXPLANATION (Col 8-12, Row 2) */}
        <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="glass-pane rounded-3xl p-6 lg:col-span-5 lg:row-span-1 shadow-lg border border-purple-500/30 bg-purple-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
              <Bot className="h-4 w-4" /> Grounded AI Layer
            </h2>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-1 rounded-md border border-purple-500/30">LLM</span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed mt-3">
            AI explains the decision, but cannot make or alter it. The calculated metrics are passed as locked variables to ensure zero hallucination of facts.
          </p>
          <div className="mt-3 p-3 bg-black/40 rounded-xl border border-purple-500/20 flex items-center gap-2">
             <CheckCircle2 className="h-4 w-4 text-purple-400" />
             <span className="text-xs text-white/90">Objection Handling</span>
          </div>
        </motion.div>

        {/* CARD 5: TRANSPARENCY & DATA (Col 8-12, Row 3) */}
        <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="glass-pane rounded-3xl p-6 lg:col-span-5 lg:row-span-1 shadow-lg border border-white/20 flex flex-col gap-4 justify-between">
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="flex flex-col gap-3 justify-center">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/50">Data Sources</h3>
              {DATA_SOURCES.map(src => (
                <div key={src.label} className="flex justify-between items-center text-xs">
                  <span className="text-white flex items-center gap-1.5"><src.icon className="h-3.5 w-3.5 text-white/50" /> {src.label}</span>
                  <span className="text-white/40">{src.status}</span>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col gap-3 justify-center border-l border-white/10 pl-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/50">Transparency</h3>
              {TRANSPARENCY.map(t => (
                <div key={t.label} className="flex justify-between items-center text-xs">
                  <span className="text-white">{t.label}</span>
                  <span className="text-[#8EE074] font-medium">{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
