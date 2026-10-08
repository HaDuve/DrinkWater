/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;

/**
 * Water-material palette (expand beside Colors).
 * Home opts in first; History/Settings keep Colors until a later pass.
 * Skia liquid shaders need a development client rebuild — not Expo Go alone.
 */
export const WaterMaterial = {
  light: {
    surface: '#E8F4FC',
    surfaceDeep: '#D0E8F7',
    water: '#1A7ABF',
    waterDeep: '#0D4F7A',
    foam: '#F2FAFF',
    caustic: '#5EB8E8',
    ink: '#0A2A3D',
    mist: '#60646C',
  },
  dark: {
    surface: '#0A1620',
    surfaceDeep: '#061018',
    water: '#3DA9E8',
    waterDeep: '#1A6FA8',
    foam: '#B8E0F5',
    caustic: '#6EC4F0',
    ink: '#E8F4FC',
    mist: '#8A9AAB',
  },
} as const;

export type WaterMaterialColor = keyof typeof WaterMaterial.light;

/**
 * Water-material motion. Springs use ζ = c / (2√(k·m)):
 * vessel slosh underdamped (~0.4); capillary splash closer to ~0.5.
 * Honor reduced motion at call sites.
 */
export const WaterMotion = {
  /** Full idle phase cycle (time 0 → 2π). Integer shader ω coeffs keep the seam invisible. */
  idleShimmerPeriodMs: 7200,
  /**
   * Fill level ≈ gravity-wave mass in a glass.
   * ω₀ = √(k/m) ≈ 8.2 → T ≈ 0.76s; ζ ≈ 0.43 (overshoots then settles).
   */
  fillSpring: {
    mass: 1.4,
    stiffness: 95,
    damping: 10,
  },
  /**
   * Impact ripple lifetime (age 0→1). Shader applies exp temporal damping so
   * amplitude is ~flat before the clock ends (viscous dissipation).
   */
  rippleMs: 1900,
  celebrateMs: 720,
} as const;
