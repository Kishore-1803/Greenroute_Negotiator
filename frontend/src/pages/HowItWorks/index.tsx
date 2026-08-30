import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight, Bot, Cpu, Gauge, Leaf,
  Route, Scale, ShieldCheck, Sparkles, CheckCircle2,
  Database, Zap, BrainCircuit
} from 'lucide-react';

const AGENTS = [
  { name: 'Speed', icon: Zap, color: '#facc15', role: 'Minimizes trip duration & traffic delays' },
  { name: 'Cost', icon: Scale, color: '#fb923c', role: 'Optimizes direct INR expenditure & tolls' },
  { name: 'Carbon', icon: Leaf, color: '#8EE074', role: 'Quantifies granular IPCC CO₂ emissions' },
  { name: 'Active', icon: Gauge, color: '#38bdf8', role: 'Champions cycling, walking & health' },
  { name: 'Coordinator', icon: Bot, color: '#c084fc', role: 'Synthesizes 2-round debate & resolves trade-offs' },
];

const TECH_SPONSORS = [
  {
    name: 'Gemini Multi-Agent',
    icon: Sparkles,
    color: '#38bdf8',
  },
  {
    name: 'Actian VectorAI',
    icon: Database,
    color: '#8EE074',
  },
  {
    name: 'Google Maps API',
    icon: Route,
    color: '#fb923c',
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

export function HowItWorksPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#11240E] via-black to-black selection:bg-[#8EE074]/30">
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
        
        {/* Page Header */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-sm flex items-center gap-3 justify-center md:justify-start">
              <Cpu className="h-10 w-10 text-[#8EE074]" />
              How GreenRoute Works
            </h1>
          </div>

          <button
            onClick={() => navigate('/trip')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#8EE074] hover:bg-[#9DF083] text-black text-sm font-black shadow-lg transition-transform hover:scale-105 cursor-pointer"
          >
            <span>Launch Live Demo</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </header>

        {/* Spacious Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CARD 1: 5-AGENT NEGOTIATION MATRIX (Col 1-7) */}
          <motion.div
            {...fadeUp}
            className="lg:col-span-7 rounded-3xl p-8 border border-purple-500/30 shadow-2xl backdrop-blur-2xl bg-black/40 flex flex-col justify-between relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
            
            <div className="relative z-10 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <BrainCircuit className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  5-Agent LLM Negotiation Debate
                </h3>
              </div>
              <p className="text-sm text-white/70 max-w-xl leading-relaxed">
                Powered by Google Gemini, five distinct persona agents debate route permutations in two structured rounds to find the optimal commuter compromise.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10 mb-6">
              {AGENTS.map((agent) => {
                const Icon = agent.icon;
                return (
                  <div key={agent.name} className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${agent.color}15`, color: agent.color }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-bold text-white tracking-tight mb-1">{agent.name}</span>
                    <span className="text-[10px] text-white/50 leading-tight">{agent.role}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 text-xs relative z-10 font-bold tracking-wide">
              <span className="text-white/50 font-mono">ROUND 1: <span className="text-white">ADVOCACY</span></span>
              <ArrowRight className="h-4 w-4 text-white/20 hidden sm:block" />
              <span className="text-white/50 font-mono">ROUND 2: <span className="text-white">REBUTTAL</span></span>
              <ArrowRight className="h-4 w-4 text-white/20 hidden sm:block" />
              <span className="text-purple-400 font-mono">FINAL: CONSENSUS</span>
            </div>
          </motion.div>

          {/* CARD 2: ACTIAN VECTOR DB (Col 8-12) */}
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.1 }}
            className="lg:col-span-5 rounded-3xl p-8 border border-[#8EE074]/30 shadow-2xl backdrop-blur-2xl bg-black/40 flex flex-col justify-between relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-bl from-[#8EE074]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
            
            <div className="relative z-10 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl bg-[#8EE074]/20 border border-[#8EE074]/30 flex items-center justify-center text-[#8EE074] shrink-0">
                  <Database className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">Actian VectorAI Memory</h3>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                Before negotiation begins, we query Actian Vector DB to retrieve the user's historical trip preferences and implicit biases using Cohere Embeddings.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10 mb-6">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center text-center">
                <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">Embedding Engine</span>
                <div className="text-base font-bold text-white">Cohere Embed v3</div>
              </div>
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center text-center">
                <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">Vector Storage</span>
                <div className="text-base font-bold text-[#8EE074]">Actian VectorAI</div>
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative z-10">
              <div className="h-full bg-gradient-to-r from-[#8EE074]/20 via-[#8EE074] to-[#8EE074]/20 w-full animate-pulse" />
            </div>
          </motion.div>

          {/* CARD 3: DETERMINISTIC GATE (Col 1-7) */}
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.15 }}
            className="lg:col-span-7 rounded-3xl p-8 border border-emerald-500/30 shadow-2xl backdrop-blur-2xl bg-black/40 flex flex-col justify-between relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  Deterministic Dual-Gate Validation
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-widest hidden sm:block">
                    Zero Hallucination
                  </span>
                </h3>
              </div>
              <p className="text-sm text-white/70 leading-relaxed mb-6">
                We enforce a strict <strong>Math-Before-AI</strong> policy. The LLM Coordinator’s decision is run through an analytical utility threshold to eliminate hallucinations on facts (time, distance, cost).
              </p>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 font-mono text-sm flex flex-col justify-center">
                <span className="text-white/40 uppercase tracking-widest text-[10px] mb-2 font-sans font-bold">Utility Function (Calculated in Python)</span>
                <div className="text-emerald-400 font-bold text-base md:text-lg">
                  U = w_t(1 - t/t_max) + w_c(1 - c/c_max) + w_e(1 - e/e_max)
                </div>
                <div className="text-white/60 mt-4 pt-4 border-t border-white/10 text-xs">
                  Threshold Check: Requires ΔUtility ≥ 0.15
                </div>
              </div>
            </div>
          </motion.div>

          {/* CARD 4: TECH STACK (Col 8-12) */}
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.2 }}
            className="lg:col-span-5 rounded-3xl p-8 border border-white/10 shadow-2xl backdrop-blur-2xl bg-black/40 flex flex-col relative group"
          >
            <h3 className="text-2xl font-black text-white tracking-tight mb-6">Tech Sponsors & Core Stack</h3>
            
            <div className="flex flex-col gap-4 flex-1 justify-center relative z-10 mb-6">
              {TECH_SPONSORS.map((tech) => (
                <div key={tech.name} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${tech.color}15`, border: `1px solid ${tech.color}30` }}>
                    <tech.icon className="h-6 w-6" style={{ color: tech.color }} />
                  </div>
                  <div className="text-lg font-bold text-white tracking-tight">{tech.name}</div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50 font-bold uppercase tracking-widest">
              <span>FastAPI • React • Tailwind CSS</span>
              <CheckCircle2 className="h-4 w-4 text-[#8EE074]" />
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
    </div>
  );
}

