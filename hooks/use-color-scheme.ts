import { useAppearance } from '@/contexts/appearance-context';
export function useColorScheme(): 'light' | 'dark' {
  return useAppearance().scheme;
}
