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
  const size = 180;
  const strokeWidth = 18;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="dark-glass-pane rounded-3xl p-5 sm:p-7 border border-white/20 shadow-2xl backdrop-blur-2xl bg-black/40 flex flex-col justify-between gap-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-[#8EE074]/20 border border-[#8EE074]/30 flex items-center justify-center text-[#8EE074] shadow-sm">
            <PieChart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Modal Split & Efficiency
            </h3>
            <p className="text-xs text-white/60">
              Distribution of transport modes selected across journeys
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
          <span>96% Clean Transit</span>
        </div>
      </div>

      {/* Content Layout: Donut Chart on Left + Mode Progress Bars on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Donut Chart Ring */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-[180px] h-[180px]">
            <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
              {/* Background Track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={strokeWidth}
              />

              {/* Segments */}
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
                    className="transition-all duration-700 hover:opacity-80"
                  />
                );
              })}
            </svg>

            {/* Inner Ring Metric Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-3xl font-black text-white tracking-tight leading-none">
                {totalTrips}
              </span>
              <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider mt-1">
                Total Trips
              </span>
            </div>
          </div>
        </div>

        {/* Modal Bars Breakdown */}
        <div className="md:col-span-7 flex flex-col gap-3.5">
          {MODAL_DATA.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.mode} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                    <span className="text-white/90">{item.label}</span>
                    <span className="text-[10px] text-white/40 font-mono">({item.carbonGPerKm} g/km)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{item.percentage}%</span>
                    <span className="text-white/40 text-[11px]">({item.tripsCount})</span>
                  </div>
                </div>

                {/* Progress Bar Track */}
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                      boxShadow: `0 0 10px ${item.color}50`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Footer Insight */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-white/60">
        <span>Highest Carbon Savings: <strong className="text-[#8EE074]">Metro Rail (14g CO₂/km)</strong></span>
        <span className="text-white/40">Updated real-time</span>
      </div>
    </div>
  );
}
