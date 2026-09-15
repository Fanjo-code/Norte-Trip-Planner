import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Returns the active color scheme ('light' | 'dark').
 *
 * RN 0.86+ `useColorScheme` can also return `'unspecified'` when the system
 * hasn't resolved a scheme yet. We normalize that to 'light' so every consumer
 * gets a valid theme key.
 */
export function useColorScheme(): 'light' | 'dark' {
  const scheme = useRNColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}
