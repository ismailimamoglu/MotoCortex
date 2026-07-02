import { Platform } from 'react-native';
import { useAppStore } from './store/useAppStore';

// ─── Design Token Palettes ──────────────────────────────────────
export interface ThemeColors {
  bg: string;
  card: string;
  elevated: string;
  border: string;
  cyan: string;
  green: string;
  red: string;
  amber: string;
  purple: string;
  textPri: string;
  textSec: string;
  textTertiary: string;
  overlay: string;
  overlayHeavy: string;
  cardBorder: string;
  cardBg: string;
  accentGlow: string;
  mono: string;
  statusBarStyle: 'light-content' | 'dark-content';
}

export const darkTheme: ThemeColors = {
  bg: '#161722',
  card: '#212333',
  elevated: '#2b2e42',
  border: '#343952',
  cyan: '#007eff',
  green: '#00ff88',
  red: '#ff3b3b',
  amber: '#ffb800',
  purple: '#8b5cf6',
  textPri: '#e8eaed',
  textSec: '#a0a0a0',
  textTertiary: '#9ca3af',
  overlay: 'rgba(0, 0, 0, 0.75)',
  overlayHeavy: 'rgba(0, 0, 0, 0.85)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  cardBg: 'rgba(33, 35, 51, 0.65)',
  accentGlow: '#007eff',
  mono: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  statusBarStyle: 'light-content',
};

export const lightTheme: ThemeColors = {
  bg: '#f3f4f6',
  card: '#ffffff',
  elevated: '#f9fafb',
  border: 'rgba(0, 0, 0, 0.08)',
  cyan: '#0055ff',
  green: '#059669',
  red: '#dc2626',
  amber: '#d97706',
  purple: '#7c3aed',
  textPri: '#111827',
  textSec: '#4b5563',
  textTertiary: '#9ca3af',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayHeavy: 'rgba(0, 0, 0, 0.65)',
  cardBorder: 'rgba(0, 0, 0, 0.08)',
  cardBg: 'rgba(255, 255, 255, 0.85)',
  accentGlow: '#0055ff',
  mono: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  statusBarStyle: 'dark-content',
};

export function getTheme(mode: 'dark' | 'light'): ThemeColors {
  return mode === 'light' ? lightTheme : darkTheme;
}

/**
 * Hook that reads the current theme from Zustand and returns the active palette.
 * Every component should use this as the single source of truth for colors.
 */
export function useThemeColors(): ThemeColors {
  const theme = useAppStore((state) => state.theme);
  return getTheme(theme);
}
