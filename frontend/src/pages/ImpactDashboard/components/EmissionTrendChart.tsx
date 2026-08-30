import { useState } from 'react';
import { TrendingDown, Calendar, Sparkles } from 'lucide-react';

interface DataPoint {
  day: string;
  actualCarbonKg: number;
  baselineCarbonKg: number;
  savedKg: number;
}

const WEEKLY_DATA: DataPoint[] = [
  { day: 'Mon', actualCarbonKg: 1.2, baselineCarbonKg: 3.8, savedKg: 2.6 },
  { day: 'Tue', actualCarbonKg: 0.8, baselineCarbonKg: 4.2, savedKg: 3.4 },
  { day: 'Wed', actualCarbonKg: 1.5, baselineCarbonKg: 4.0, savedKg: 2.5 },
  { day: 'Thu', actualCarbonKg: 0.4, baselineCarbonKg: 3.9, savedKg: 3.5 },
  { day: 'Fri', actualCarbonKg: 1.1, baselineCarbonKg: 4.5, savedKg: 3.4 },
  { day: 'Sat', actualCarbonKg: 0.2, baselineCarbonKg: 2.8, savedKg: 2.6 },
  { day: 'Sun', actualCarbonKg: 0.0, baselineCarbonKg: 2.2, savedKg: 2.2 },
];

const MONTHLY_DATA: DataPoint[] = [
  { day: 'W1', actualCarbonKg: 5.2, baselineCarbonKg: 18.5, savedKg: 13.3 },
  { day: 'W2', actualCarbonKg: 4.1, baselineCarbonKg: 19.2, savedKg: 15.1 },
  { day: 'W3', actualCarbonKg: 3.8, baselineCarbonKg: 18.8, savedKg: 15.0 },
  { day: 'W4', actualCarbonKg: 3.2, baselineCarbonKg: 20.1, savedKg: 16.9 },
];

export function EmissionTrendChart() {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const dataset = timeframe === 'weekly' ? WEEKLY_DATA : MONTHLY_DATA;
  const maxVal = Math.max(...dataset.map(d => Math.max(d.baselineCarbonKg, d.actualCarbonKg))) * 1.25;

  // Chart dimensions
  const width = 600;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  // Generate SVG coordinates
  const getX = (index: number) => paddingX + (index / (dataset.length - 1)) * plotWidth;
  const getY = (val: number) => height - paddingY - (val / maxVal) * plotHeight;

  // Baseline line & area (Gray / Red tint)
  const baselinePoints = dataset.map((d, i) => `${getX(i)},${getY(d.baselineCarbonKg)}`).join(' ');
  const baselineArea = `${getX(0)},${height - paddingY} ` + baselinePoints + ` ${getX(dataset.length - 1)},${height - paddingY}`;

  // Actual GreenRoute line & area (Vibrant Eco Green)
  const actualPoints = dataset.map((d, i) => `${getX(i)},${getY(d.actualCarbonKg)}`).join(' ');
  const actualArea = `${getX(0)},${height - paddingY} ` + actualPoints + ` ${getX(dataset.length - 1)},${height - paddingY}`;

  const currentHovered = hoveredIndex !== null ? dataset[hoveredIndex] : null;

  return (
    <div className="dark-glass-pane rounded-3xl p-5 sm:p-7 border border-white/20 shadow-2xl backdrop-blur-2xl bg-black/40 flex flex-col gap-5 relative overflow-hidden">
      {/* Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-[#8EE074]/20 border border-[#8EE074]/30 flex items-center justify-center text-[#8EE074] shadow-sm">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Emissions Trajectory</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#8EE074]/20 text-[#8EE074] border border-[#8EE074]/30 font-semibold">
                Live Model
              </span>
            </h3>
            <p className="text-xs text-white/60">
              Comparative carbon output: Solo Car Baseline vs. GreenRoute Optimized Choices
            </p>
          </div>
        </div>

        {/* Timeframe Toggle Buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setTimeframe('weekly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'weekly'
                ? 'bg-[#4D7C3E] text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('monthly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'monthly'
                ? 'bg-[#4D7C3E] text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative w-full aspect-[2.4/1] min-h-[220px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Eco Green Gradient Area */}
            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8EE074" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8EE074" stopOpacity="0.0" />
            </linearGradient>

            {/* Baseline Gray/Red Gradient Area */}
            <linearGradient id="baselineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height - paddingY - ratio * plotHeight;
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(255, 255, 255, 0.35)"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {(maxVal * ratio).toFixed(1)}k
                </text>
              </g>
            );
          })}

          {/* Baseline Area & Line */}
          <polygon points={baselineArea} fill="url(#baselineGradient)" />
          <polyline
            points={baselinePoints}
            fill="none"
            stroke="rgba(239, 68, 68, 0.7)"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinecap="round"
          />

          {/* Actual GreenRoute Area & Line */}
          <polygon points={actualArea} fill="url(#greenGradient)" />
          <polyline
            points={actualPoints}
            fill="none"
            stroke="#8EE074"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="drop-shadow(0 0 8px rgba(142, 224, 116, 0.6))"
          />

          {/* Data Interactive Nodes & Tooltip Trigger Zones */}
          {dataset.map((d, i) => {
            const cx = getX(i);
            const cyActual = getY(d.actualCarbonKg);
            const cyBaseline = getY(d.baselineCarbonKg);
            const isHovered = hoveredIndex === i;

            return (
              <g key={d.day} onMouseEnter={() => setHoveredIndex(i)}>
                {/* Invisible Hover Hitbox */}
                <rect
                  x={cx - 20}
                  y={0}
                  width="40"
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                />

                {/* Vertical Guideline on Hover */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={paddingY}
                    x2={cx}
                    y2={height - paddingY}
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Baseline Dot */}
                <circle
                  cx={cx}
                  cy={cyBaseline}
                  r={isHovered ? 4.5 : 3}
                  fill="#ef4444"
                  stroke="black"
                  strokeWidth="1.5"
                  className="transition-all duration-200"
                />

                {/* GreenRoute Glow Dot */}
                <circle
                  cx={cx}
                  cy={cyActual}
                  r={isHovered ? 6 : 4}
                  fill="#8EE074"
                  stroke="#11240E"
                  strokeWidth="2"
                  className="transition-all duration-200"
                />

                {/* X-Axis Labels */}
                <text
                  x={cx}
                  y={height - paddingY + 18}
                  textAnchor="middle"
                  fill={isHovered ? '#8EE074' : 'rgba(255, 255, 255, 0.6)'}
                  fontSize="11"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {d.day}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Card */}
        {currentHovered && (
          <div className="absolute top-2 right-4 bg-black/85 backdrop-blur-xl border border-[#8EE074]/40 rounded-2xl p-3 shadow-2xl flex flex-col gap-1 text-xs z-20 pointer-events-none transition-all">
            <span className="font-extrabold text-white flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#8EE074]" />
              {currentHovered.day} Commute Analytics
            </span>
            <div className="flex items-center justify-between gap-4 mt-1">
              <span className="text-white/60">Solo Car Baseline:</span>
              <span className="font-bold text-red-400">{currentHovered.baselineCarbonKg} kg CO₂</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/60">GreenRoute Actual:</span>
              <span className="font-bold text-[#8EE074]">{currentHovered.actualCarbonKg} kg CO₂</span>
            </div>
            <div className="mt-1 pt-1 border-t border-white/10 flex items-center justify-between gap-4 text-[#8EE074] font-bold">
              <span>Net CO₂ Avoided:</span>
              <span>-{currentHovered.savedKg} kg ({(currentHovered.savedKg / currentHovered.baselineCarbonKg * 100).toFixed(0)}%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Summary Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10 text-xs">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#8EE074] shadow-[0_0_8px_rgba(142,224,116,0.8)]" />
            <span className="font-semibold text-white">GreenRoute Multi-Modal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="font-medium text-white/60">Solo Driving Baseline</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-white/70">
          <Sparkles className="h-4 w-4 text-[#8EE074]" />
          <span>Average Carbon Reduction: <strong className="text-white">~68.4%</strong></span>
        </div>
      </div>
    </div>
  );
}
