import { Platform, type ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import type { IoniconName } from '@/types/trip';

interface TabIconProps {
  /** Apple SF Symbol name — used on iOS for a native look. */
  sf: SymbolViewProps['name'];
  /** Ionicons fallback for Android/web. */
  fallback: IoniconName;
  color: ColorValue;
  size?: number;
}

/** Tab bar icon: native SF Symbol on iOS, Ionicons everywhere else. */
export function TabIcon({ sf, fallback, color, size = 26 }: TabIconProps) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={sf} size={size} tintColor={color} />;
  }
  return <Ionicons name={fallback} size={size} color={color} />;
}
