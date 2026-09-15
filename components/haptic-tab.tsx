import * as Haptics from 'expo-haptics';

// expo-router 57 vendors react-navigation and is no longer compatible with the
// standalone @react-navigation/* packages (SDK 56+). Import the pressable and
// the tab-button props type from expo-router so everything matches.
import { PlatformPressable } from 'expo-router/react-navigation';
import type { BottomTabBarButtonProps } from 'expo-router/build/react-navigation/bottom-tabs/types';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
