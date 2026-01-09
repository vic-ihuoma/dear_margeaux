/**
 * Design tokens for Dear Margeaux boutique e-commerce
 * Inspired by oru.club with warm, sophisticated palette
 */

export const colors = {
  primary: {
    DEFAULT: '#8B4513',
    50: '#F7F0EB',
    100: '#EDE0D4',
    200: '#DBC1A9',
    300: '#C9A27E',
    400: '#B78353',
    500: '#8B4513',
    600: '#7A3D11',
    700: '#69350F',
    800: '#582D0D',
    900: '#47250B',
    950: '#361D08',
  },
  secondary: {
    DEFAULT: '#FFF8DC',
    50: '#FFFEFB',
    100: '#FFFDF7',
    200: '#FFFBEF',
    300: '#FFF9E7',
    400: '#FFF8DC',
    500: '#FFF3C4',
    600: '#FFEAAB',
    700: '#FFE193',
    800: '#FFD87A',
    900: '#FFCF62',
    950: '#FFC649',
  },
  accent: {
    DEFAULT: '#E2725B',
    50: '#FCF0ED',
    100: '#F9E1DB',
    200: '#F3C3B7',
    300: '#EDA593',
    400: '#E7876F',
    500: '#E2725B',
    600: '#D95A40',
    700: '#C14832',
    800: '#9D3B29',
    900: '#792E20',
    950: '#552117',
  },
  text: {
    DEFAULT: '#333333',
    primary: '#333333',
    secondary: '#666666',
    muted: '#999999',
    inverse: '#FFFFFF',
  },
  background: {
    DEFAULT: '#FAFAFA',
    primary: '#FAFAFA',
    secondary: '#FFFFFF',
    tertiary: '#F5F5F5',
    inverse: '#333333',
  },
  border: {
    DEFAULT: '#E5E5E5',
    light: '#F0F0F0',
    dark: '#CCCCCC',
  },
  status: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Georgia', 'serif'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
  },
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

export const transitions = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  timing: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  breakpoints,
} as const;

export default tokens;
