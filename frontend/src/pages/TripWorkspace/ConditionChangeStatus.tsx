import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw, Route, Scale, ShieldCheck } from 'lucide-react';

const STEPS = [
  { icon: Route, label: 'Updating route geometry…' },
  { icon: RefreshCw, label: 'Recomputing travel times & speeds…' },
  { icon: Scale, label: 'Comparing time, cost & CO₂ alternatives…' },
  { icon: ShieldCheck, label: 'Evaluating deterministic switch policy…' },
];
const ROTATE_MS = 1000;

export function ConditionChangeStatus() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % STEPS.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="dark-glass-pane rounded-2xl px-5 py-3.5 text-sm text-white flex items-center justify-between border border-white/20 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8EE074]/20 text-[#8EE074]">
          <RefreshCw className="h-4 w-4 animate-spin" />
        </span>
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8EE074]">
            Condition Change In Progress
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={STEPS[index].label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-xs sm:text-sm font-medium text-white/90"
            >
              {STEPS[index].label}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/60">
        <span>Step {index + 1} of 4</span>
      </div>
    </div>
  );
}

