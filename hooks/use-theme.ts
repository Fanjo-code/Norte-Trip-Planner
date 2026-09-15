import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Returns the resolved color tokens for the active color scheme. */
export function useTheme() {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}
