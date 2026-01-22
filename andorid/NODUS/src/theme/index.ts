const darkColors = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  accent: '#1ABC9C',
  accentDark: '#158F76',
  text: '#F0F0F0',
  textSecondary: '#888888',
  error: '#E74C3C',
  warning: '#F39C12',
  online: '#2ECC71',
  offline: '#555555',
  border: '#333333',
};

const lightColors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceLight: '#E8E8E8',
  accent: '#1ABC9C',
  accentDark: '#158F76',
  text: '#1A1A1A',
  textSecondary: '#666666',
  error: '#E74C3C',
  warning: '#F39C12',
  online: '#2ECC71',
  offline: '#AAAAAA',
  border: '#DDDDDD',
};

const amoledColors = {
  background: '#000000',
  surface: '#0A0A0A',
  surfaceLight: '#151515',
  accent: '#1ABC9C',
  accentDark: '#158F76',
  text: '#FFFFFF',
  textSecondary: '#777777',
  error: '#E74C3C',
  warning: '#F39C12',
  online: '#2ECC71',
  offline: '#444444',
  border: '#222222',
};

const midnightColors = {
  background: '#0A0E14',
  surface: '#111820',
  surfaceLight: '#1A2332',
  accent: '#00D9FF',
  accentDark: '#00A8C6',
  text: '#E6E6E6',
  textSecondary: '#6B7D93',
  error: '#FF5555',
  warning: '#FFB86C',
  online: '#50FA7B',
  offline: '#44475A',
  border: '#2A3444',
};

const stealthColors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2D2D2D',
  accent: '#808080',
  accentDark: '#606060',
  text: '#CCCCCC',
  textSecondary: '#666666',
  error: '#CC4444',
  warning: '#CC9944',
  online: '#66AA66',
  offline: '#444444',
  border: '#333333',
};

const hackerColors = {
  background: '#0A0A0A',
  surface: '#0F0F0F',
  surfaceLight: '#1A1A1A',
  accent: '#00FF00',
  accentDark: '#00CC00',
  text: '#00FF00',
  textSecondary: '#008800',
  error: '#FF0000',
  warning: '#FFFF00',
  online: '#00FF00',
  offline: '#333333',
  border: '#003300',
};

export type ThemeName = 'dark' | 'light' | 'system' | 'amoled' | 'midnight' | 'stealth' | 'hacker';

export const getColors = (theme: ThemeName) => {
  switch (theme) {
    case 'light': return lightColors;
    case 'amoled': return amoledColors;
    case 'midnight': return midnightColors;
    case 'stealth': return stealthColors;
    case 'hacker': return hackerColors;
    default: return darkColors;
  }
};

export const colors = darkColors;

const spacingCompact = { xs: 2, sm: 4, md: 10, lg: 16, xl: 24 };
const spacingNormal = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
const spacingComfortable = { xs: 6, sm: 12, md: 20, lg: 32, xl: 40 };

export const getSpacing = (density: 'compact' | 'normal' | 'comfortable') => {
  if (density === 'compact') return spacingCompact;
  if (density === 'comfortable') return spacingComfortable;
  return spacingNormal;
};

export const spacing = spacingNormal;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
};

// Default theme hook - returns dark theme with normal density
export const useTheme = () => ({
  colors: darkColors,
  spacing: spacingNormal,
  radius,
  displayMode: 'telegram',
  density: 'normal' as const,
});
