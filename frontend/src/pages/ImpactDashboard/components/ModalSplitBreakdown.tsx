import { PieChart, Zap, Bike, Bus, Train, Car } from 'lucide-react';

interface ModeStat {
  mode: string;
  label: string;
  icon: typeof Train;
  tripsCount: number;
  percentage: number;
  carbonGPerKm: number;
  color: string;
}

const MODAL_DATA: ModeStat[] = [
  { mode: 'metro', label: 'Metro Rail', icon: Train, tripsCount: 14, percentage: 38, carbonGPerKm: 14, color: '#8EE074' },
  { mode: 'bus', label: 'Public Bus', icon: Bus, tripsCount: 10, percentage: 28, carbonGPerKm: 42, color: '#38bdf8' },
  { mode: 'two_wheeler', label: 'Electric / 2W', icon: Zap, tripsCount: 7, percentage: 19, carbonGPerKm: 58, color: '#facc15' },
  { mode: 'cycling', label: 'Bicycle / Active', icon: Bike, tripsCount: 4, percentage: 11, carbonGPerKm: 0, color: '#34d399' },
  { mode: 'car', label: 'Carpool / Shared', icon: Car, tripsCount: 2, percentage: 4, carbonGPerKm: 135, color: '#fb923c' },
];

export function ModalSplitBreakdown() {
  const totalTrips = MODAL_DATA.reduce((acc, m) => acc + m.tripsCount, 0);

  // SVG Circular / Ring Geometry
  const size = 120;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="dark-glass-pane rounded-2xl p-3 sm:p-4 border border-white/15 shadow-xl backdrop-blur-xl bg-black/40 flex flex-col justify-between h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-[#8EE074]/20 border border-[#8EE074]/30 flex items-center justify-center text-[#8EE074] shrink-0">
            <PieChart className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Modal Split & Efficiency
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
          <span>96% Clean</span>
        </div>
      </div>

      {/* Content Layout */}
      <div className="grid grid-cols-12 gap-3 items-center flex-1 my-1">
        {/* Donut Chart Ring */}
        <div className="col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-[110px] h-[110px]">
            <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={strokeWidth}
              />

              {MODAL_DATA.map((m) => {
                const strokeDasharray = `${(m.percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                accumulatedPercent += m.percentage;

                return (
                  <circle
                    key={m.mode}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={m.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                );
              })}
            </svg>

            {/* Inner Ring Metric Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-xl font-black text-white tracking-tight leading-none">
                {totalTrips}
              </span>
              <span className="text-[8px] uppercase font-bold text-white/50 tracking-wider mt-0.5">
                Trips
              </span>
            </div>
          </div>
        </div>

        {/* Modal Bars Breakdown */}
        <div className="col-span-7 flex flex-col gap-1.5 justify-center">
          {MODAL_DATA.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.mode} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[10.5px] font-semibold leading-tight">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3" style={{ color: item.color }} />
                    <span className="text-white/90">{item.label}</span>
                  </div>
                  <span className="text-white font-bold">{item.percentage}%</span>
                </div>

                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-px border border-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                      boxShadow: `0 0 6px ${item.color}40`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Insight */}
      <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px] text-white/60">
        <span>Top Efficiency: <strong className="text-[#8EE074]">Metro (14g CO₂/km)</strong></span>
        <span className="text-white/40">Live Model</span>
      </div>
    </div>
  );
}
