/**
 * Design tokens for Norte Trip Planner.
 * Extended from the Expo default template theme (SDK 54).
 */

import { Platform } from 'react-native';

// Brand accent — deep emerald-teal, inspired by the "Norte" / Douro landscape.
const accentLight = '#0E7C66';
const accentDark = '#35D6B2';

export const Colors = {
  light: {
    text: '#101113',
    textSecondary: '#6A7078',
    background: '#F6F6F4',
    card: '#FFFFFF',
    hairline: '#ECECE8',
    tint: accentLight,
    accent: accentLight,
    accentSoft: '#E0F2EC',
    icon: '#6A7078',
    tabIconDefault: '#A8ADB2',
    tabIconSelected: accentLight,
    placeholder: '#9BA1A8',
    badge: accentLight,
    badgeText: '#FFFFFF',
    rating: '#E5A83B',
    danger: '#C0392B',
    overlay: 'rgba(16,17,19,0.45)',
    shadow: '#000000',
  },
  dark: {
    text: '#F2F3F1',
    textSecondary: '#A7ADB2',
    background: '#0D0F0E',
    card: '#171A18',
    hairline: '#262B29',
    tint: accentDark,
    accent: accentDark,
    accentSoft: '#12312B',
    icon: '#A7ADB2',
    tabIconDefault: '#5C625F',
    tabIconSelected: accentDark,
    placeholder: '#5C625F',
    badge: accentDark,
    badgeText: '#06231D',
    rating: '#E5A83B',
    danger: '#E0655A',
    overlay: 'rgba(0,0,0,0.55)',
    shadow: '#000000',
  },
} as const;

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
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 40,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
} as const;

export const FontSize = {
  caption: 12,
  small: 13,
  body: 15,
  label: 17,
  title: 22,
  huge: 30,
  display: 40,
} as const;

export const CardShadow = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: {
    elevation: 2,
  },
  default: {},
});
