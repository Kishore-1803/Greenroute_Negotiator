export const colors = {
  // Backgrounds
  bgBase: '#1a2b20',
  bgDark: '#0e1a12',
  bgCard: 'rgba(255, 255, 255, 0.08)',
  bgCardDark: 'rgba(0, 0, 0, 0.55)',
  bgInput: 'rgba(255, 255, 255, 0.06)',

  // Primary Brand Greens
  primary: '#16a34a',
  primaryBright: '#8EE074',
  primaryDark: '#4D7C3E',
  primaryHover: '#5A8F48',
  primarySoft: 'rgba(142, 224, 116, 0.15)',

  // Accents & Signals
  amber: '#FBBF24',
  amberSoft: 'rgba(251, 191, 36, 0.15)',
  sky: '#38BDF8',
  skySoft: 'rgba(56, 189, 248, 0.15)',
  purple: '#C084FC',
  purpleSoft: 'rgba(192, 132, 252, 0.15)',
  red: '#F87171',
  redSoft: 'rgba(248, 113, 113, 0.2)',

  // Text colors
  textWhite: '#FFFFFF',
  textSubtle: 'rgba(255, 255, 255, 0.85)',
  textMuted: 'rgba(255, 255, 255, 0.65)',
  textDim: 'rgba(255, 255, 255, 0.45)',
  textDark: '#17211B',

  // Borders
  borderLight: 'rgba(255, 255, 255, 0.22)',
  borderSubtle: 'rgba(255, 255, 255, 0.12)',
  borderAccent: '#8EE074',
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
  full: 9999,
};

// Light-glass palette: the white-forward, low-green system used by the auth/profile screens
// (and any future redesign), kept separate from `colors` above so the existing dark Home/Trip/
// HowItWorks screens are untouched.
export const light = {
  paper: '#FBFAF6',
  paperSoft: '#F1EFE8',
  ink: '#202A22',
  inkSoft: '#6E7A6F',
  inkFaint: '#9CA69B',

  moss: '#3E6B4C',
  mossDeep: '#294A34',
  mossPale: '#E4EBE1',
  sand: '#EFE7D6',

  hairline: 'rgba(32, 42, 34, 0.09)',
  glassFill: 'rgba(255, 255, 255, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.9)',

  danger: '#8A5A4A',
};

// Categorical hues for the three utility dimensions, in fixed order. Same identities the dark
// screens use (speed=blue, cost=amber, carbon=green) but re-stepped for a pale surface -- the
// dark theme's #38BDF8/#FBBF24/#8EE074 are far too light to read on paper.
//
// Validated, not eyeballed: green and amber are the pair red-green colourblind readers lose
// first, so these are separated by lightness as well as hue. All six checks pass against the
// light surface (protan ΔE 13.7 on that pair, contrast >= 3:1 on all three). Re-run before
// changing any value:
//   node scripts/validate_palette.js "#1D6DA8,#C97F14,#256B3C" --mode light
export const dimensionColors = {
  time: '#1D6DA8',
  cost: '#C97F14',
  carbon: '#256B3C',
} as const;
