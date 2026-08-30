import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number;
  className?: string;
}

/**
 * Minimalist, high-precision Layer Icon
 * Stacked isometric planes representing spatial & data layers with clean geometry.
 */
export function LayerIcon({ size = 18, strokeWidth = 1.75, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Top Layer */}
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      {/* Middle Layer */}
      <path d="M2 12l10 5 10-5" />
      {/* Bottom Layer */}
      <path d="M2 17l10 5 10-5" />
    </svg>
  );
}

/**
 * Minimalist, high-precision Satellite Icon
 * Features a modern satellite bus, dual solar panel wings with minimalist cells,
 * a directional dish antenna, and transmission wave pulses.
 */
export function SatelliteIcon({ size = 18, strokeWidth = 1.75, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Main Satellite Body / Avionics Core */}
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
      
      {/* Left Solar Array Wing */}
      <path d="M3 10h6v4H3z" />
      <path d="M6 10v4" />

      {/* Right Solar Array Wing */}
      <path d="M15 10h6v4h-6z" />
      <path d="M18 10v4" />

      {/* Communications Antenna Feed Horn / Boom */}
      <path d="M12 9V5" />
      <path d="M9.5 4a3.5 3.5 0 0 1 5 0" />

      {/* Sensor / Ground Link Transmitter */}
      <circle cx="12" cy="18.5" r="0.75" fill="currentColor" />
      <path d="M12 15v1.5" />
    </svg>
  );
}

/**
 * Minimalist Map / Streets Vector Icon
 */
export function MapMinimalIcon({ size = 18, strokeWidth = 1.75, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

/**
 * Minimalist Terrain / Topography Vector Icon
 */
export function TerrainMinimalIcon({ size = 18, strokeWidth = 1.75, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  );
}
