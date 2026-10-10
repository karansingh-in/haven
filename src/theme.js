// theme.js — Haven design tokens (iOS 26 Liquid Glass + whitespace system)

const ACCENT_PALETTE = {
  blue: '#007AFF',
  green: '#34C759',
  indigo: '#5856D6',
  orange: '#FF9500',
};

const ACCENT_KEYS = Object.keys(ACCENT_PALETTE);
const DEFAULT_ACCENT = 'blue';

const LIGHT_COLORS = {
  bg: '#FFFFFF',
  surface: '#F2F2F7',
  elevated: '#FFFFFF',
  label: {
    primary: '#000000',
    secondary: '#3C3C4399',  // 60%
    tertiary: '#3C3C434D',   // 30%
    quaternary: '#3C3C432E', // 18%
  },
  separator: '#3C3C434A',    // 29%
  fill: {
    quaternary: null, // set dynamically from accent
  },
  accent: ACCENT_PALETTE[DEFAULT_ACCENT],
};

const DARK_COLORS = {
  bg: '#000000',
  surface: '#1C1C1E',
  elevated: '#2C2C2E',
  label: {
    primary: '#FFFFFF',
    secondary: '#EBEBF599',  // 60%
    tertiary: '#EBEBF54D',   // 30%
    quaternary: 'EBEBF52E',  // 18%
  },
  separator: '#54545880',    // 50%
  fill: {
    quaternary: null,
  },
  accent: ACCENT_PALETTE[DEFAULT_ACCENT],
};

const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
};

const RADIUS = {
  card: 12,
  control: 10,
  sheet: 20,
  pill: 'full', // height/2 at render time
};

const TYPOGRAPHY = {
  largeTitle: { fontSize: 34, fontWeight: '700', lineHeight: 41, fontFamily: 'Inter', fontVariant: ['tabular-nums'] },
  title1: { fontSize: 28, fontWeight: '700', lineHeight: 34, fontFamily: 'Inter' },
  title2: { fontSize: 22, fontWeight: '600', lineHeight: 28, fontFamily: 'Inter' },
  headline: { fontSize: 17, fontWeight: '600', lineHeight: 22, fontFamily: 'Inter' },
  body: { fontSize: 17, fontWeight: '400', lineHeight: 22, fontFamily: 'Inter' },
  subhead: { fontSize: 15, fontWeight: '400', lineHeight: 20, fontFamily: 'Inter' },
  footnote: { fontSize: 13, fontWeight: '400', lineHeight: 18, fontFamily: 'Inter' },
  caption: { fontSize: 11, fontWeight: '500', lineHeight: 16, fontFamily: 'Inter' },
  // Number-specific styles with tabular-nums
  timer: { fontSize: 72, fontWeight: '700', lineHeight: 72, fontFamily: 'Inter', fontVariant: ['tabular-nums'] },
  countdown: { fontSize: 36, fontWeight: '700', lineHeight: 44, fontFamily: 'Inter', fontVariant: ['tabular-nums'] },
  score: { fontSize: 28, fontWeight: '700', lineHeight: 34, fontFamily: 'Inter', fontVariant: ['tabular-nums'] },
  hours: { fontSize: 17, fontWeight: '600', lineHeight: 22, fontFamily: 'Inter', fontVariant: ['tabular-nums'] },
};

const SPRINGS = {
  gentle: { damping: 22, stiffness: 120 },
  snappy: { damping: 18, stiffness: 180 },
  bouncy: { damping: 15, stiffness: 200 },
};

const HAPTICS = {
  tabChange: 'selection',
  segmentedControl: 'selection',
  rowPress: 'light',
  toggle: 'light',
  mockLog: 'light',
  timerStartStop: 'medium',
  eightHourReached: 'success',
  backlogCleared: 'success',
  streak: 'success',
  accentChange: 'selection',
  pullRefresh: 'light',
  sheetOpenClose: 'selection',
};

function withAccent(colors, accentKey) {
  const accent = ACCENT_PALETTE[accentKey] || ACCENT_PALETTE[DEFAULT_ACCENT];
  return {
    ...colors,
    accent,
    fill: {
      ...colors.fill,
      quaternary: accent + '26', // 15% opacity
    },
  };
}

let currentAccentKey = DEFAULT_ACCENT;

export const theme = {
  colors: {
    light: withAccent(LIGHT_COLORS, currentAccentKey),
    dark: withAccent(DARK_COLORS, currentAccentKey),
    getAccent: () => ACCENT_PALETTE[currentAccentKey],
    setAccent: (key) => {
      if (!ACCENT_PALETTE[key]) return false;
      currentAccentKey = key;
      theme.colors.light = withAccent(LIGHT_COLORS, key);
      theme.colors.dark = withAccent(DARK_COLORS, key);
      return true;
    },
    accentColors: ACCENT_PALETTE,
    accentKeys: ACCENT_KEYS,
    defaultAccent: DEFAULT_ACCENT,
  },
  space: SPACE,
  radius: RADIUS,
  typography: TYPOGRAPHY,
  springs: SPRINGS,
  haptics: HAPTICS,
};

export function useAccent() {
  return {
    accent: theme.colors.getAccent(),
    setAccent: theme.colors.setAccent,
    accentColors: theme.colors.accentColors,
  };
}

export default theme;