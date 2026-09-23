import { Platform } from 'react-native';
export const Colors = {
  light: {
    text: '#272D25',
    textSecondary: '#777A6E',
    background: '#F7F7F2',
    card: '#FFFFFF',
    hairline: '#E5E6DC',
    tint: '#566344',
    accent: '#566344',
    accentSoft: '#EBEEE4',
    icon: '#838778',
    tabIconDefault: '#8B8F82',
    tabIconSelected: '#566344',
    placeholder: '#999D91',
    badge: '#566344',
    badgeText: '#FFFFFF',
    rating: '#B98A42',
    danger: '#B44F39',
    overlay: 'rgba(30,36,26,.4)',
    shadow: '#20281A',
  },
  dark: {
    text: '#ECEEE4',
    textSecondary: '#A3AB98',
    background: '#171C16',
    card: '#22291F',
    hairline: '#363E30',
    tint: '#B7C79B',
    accent: '#B7C79B',
    accentSoft: '#323D29',
    icon: '#A3AB98',
    tabIconDefault: '#87917B',
    tabIconSelected: '#B7C79B',
    placeholder: '#87917B',
    badge: '#B7C79B',
    badgeText: '#20281A',
    rating: '#D3AA63',
    danger: '#EF967E',
    overlay: 'rgba(0,0,0,.5)',
    shadow: '#000000',
  },
} as const;
export const Fonts = {
  sans:
    Platform.OS === 'web'
      ? 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      : 'System',
  serif: Platform.OS === 'ios' ? 'Georgia' : Platform.OS === 'web' ? 'Georgia, "Playfair Display", serif' : 'Georgia, serif',
  rounded: 'System',
  mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
};
export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, huge: 40 } as const;
export const Radius = { sm: 8, md: 12, lg: 18, xl: 24 } as const;
export const FontSize = {
  caption: 11,
  small: 13,
  body: 15,
  label: 17,
  title: 24,
  huge: 34,
  display: 48,
} as const;
export const CardShadow = { boxShadow: '0 5px 24px rgba(40,48,28,0.04)' };
