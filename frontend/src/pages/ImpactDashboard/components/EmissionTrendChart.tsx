import { useState, useRef, useEffect } from 'react';
import { TrendingDown, Calendar, Sparkles } from 'lucide-react';

interface DataPoint {
  day: string;
  actual_carbon_kg: number;
  baseline_carbon_kg: number;
  saved_kg: number;
}

export function EmissionTrendChart({ trajectory }: { trajectory: DataPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 560, height: 145 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        // ensure minimum dimensions so it doesn't break
        setDimensions({ width: Math.max(width, 100), height: Math.max(height, 50) });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const dataset = trajectory && trajectory.length > 0 ? trajectory : [
    { day: 'No Data', actual_carbon_kg: 0, baseline_carbon_kg: 0, saved_kg: 0 }
  ];

  const maxVal = Math.max(...dataset.map((d) => Math.max(d.baseline_carbon_kg, d.actual_carbon_kg)), 1) * 1.2;

  // Chart dimensions from observer
  const { width, height } = dimensions;
  const paddingX = 32;
  const paddingY = 20;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  // Generate SVG coordinates
  const getX = (index: number) => {
    if (dataset.length === 1) return width / 2;
    return paddingX + (index / (dataset.length - 1)) * plotWidth;
  };
  const getY = (val: number) => height - paddingY - (val / maxVal) * plotHeight;

  // Baseline line & area
  const baselinePoints = dataset.map((d, i) => `${getX(i)},${getY(d.baseline_carbon_kg)}`).join(' ');
  const baselineArea = `${getX(0)},${height - paddingY} ` + baselinePoints + ` ${getX(dataset.length - 1)},${height - paddingY}`;

  // Actual GreenRoute line & area
  const actualPoints = dataset.map((d, i) => `${getX(i)},${getY(d.actual_carbon_kg)}`).join(' ');
  const actualArea = `${getX(0)},${height - paddingY} ` + actualPoints + ` ${getX(dataset.length - 1)},${height - paddingY}`;

  const currentHovered = hoveredIndex !== null ? dataset[hoveredIndex] : null;

  return (
    <div className="dark-glass-pane rounded-2xl p-3 sm:p-4 border border-white/15 shadow-xl backdrop-blur-xl bg-black/40 flex flex-col h-full relative overflow-hidden">
      {/* Header & Range Controls */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-[#8EE074]/20 border border-[#8EE074]/30 flex items-center justify-center text-[#8EE074] shrink-0">
            <TrendingDown className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Emissions Trajectory</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#8EE074]/20 text-[#8EE074] border border-[#8EE074]/30 font-semibold">
                Live
              </span>
            </h3>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div ref={containerRef} className="relative w-full flex-1 flex items-center justify-center min-h-[105px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible absolute inset-0"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8EE074" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8EE074" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="baselineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          {[0.33, 0.66, 1].map((ratio) => {
            const y = height - paddingY - ratio * plotHeight;
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="3 3"
                />
              </g>
            );
          })}

          {/* Baseline Area & Line */}
          <polygon points={baselineArea} fill="url(#baselineGradient)" />
          <polyline
            points={baselinePoints}
            fill="none"
            stroke="rgba(239, 68, 68, 0.65)"
            strokeWidth="1.75"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />

          {/* Actual GreenRoute Area & Line */}
          <polygon points={actualArea} fill="url(#greenGradient)" />
          <polyline
            points={actualPoints}
            fill="none"
            stroke="#8EE074"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="drop-shadow(0 0 6px rgba(142, 224, 116, 0.5))"
          />

          {/* Data Interactive Nodes */}
          {dataset.map((d, i) => {
            const cx = getX(i);
            const cyActual = getY(d.actual_carbon_kg);
            const cyBaseline = getY(d.baseline_carbon_kg);
            const isHovered = hoveredIndex === i;

            return (
              <g key={`${d.day}-${i}`} onMouseEnter={() => setHoveredIndex(i)}>
                <rect
                  x={cx - 16}
                  y={0}
                  width="32"
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                />

                {isHovered && (
                  <line
                    x1={cx}
                    y1={paddingY}
                    x2={cx}
                    y2={height - paddingY}
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                <circle
                  cx={cx}
                  cy={cyBaseline}
                  r={isHovered ? 3.5 : 2.5}
                  fill="#ef4444"
                  stroke="black"
                  strokeWidth="1"
                />

                <circle
                  cx={cx}
                  cy={cyActual}
                  r={isHovered ? 5 : 3.5}
                  fill="#8EE074"
                  stroke="#11240E"
                  strokeWidth="1.5"
                />

                <text
                  x={cx}
                  y={height - paddingY + 13}
                  textAnchor="middle"
                  fill={isHovered ? '#8EE074' : 'rgba(255, 255, 255, 0.5)'}
                  fontSize="9.5"
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
          <div className="absolute top-1 right-2 bg-black/90 backdrop-blur-xl border border-[#8EE074]/40 rounded-xl p-2 shadow-xl flex flex-col gap-0.5 text-[10px] z-20 pointer-events-none">
            <span className="font-bold text-white flex items-center gap-1">
              <Calendar className="h-3 w-3 text-[#8EE074]" />
              {currentHovered.day}
            </span>
            <div className="flex items-center justify-between gap-3 text-white/70">
              <span>Baseline: <strong className="text-red-400">{currentHovered.baseline_carbon_kg}kg</strong></span>
              <span>Actual: <strong className="text-[#8EE074]">{currentHovered.actual_carbon_kg}kg</strong></span>
            </div>
            <div className="text-[#8EE074] font-bold">
              Avoided: -{currentHovered.saved_kg}kg
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px] text-white/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#8EE074]" />
            <span>GreenRoute</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500/80" />
            <span>Solo Driving</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[#8EE074] font-semibold">
          <Sparkles className="h-3 w-3" />
          <span>Calculated from DB</span>
        </div>
      </div>
    </div>
  );
}
