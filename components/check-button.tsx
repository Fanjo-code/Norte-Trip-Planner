import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface CheckButtonProps {
  checked: boolean;
  onToggle: () => void;
}

/** Round check-off toggle with a haptic bump and a scale "pop". */
export function CheckButton({ checked, onToggle }: CheckButtonProps) {
  const t = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.3,
        speed: 60,
        bounciness: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 60,
        bounciness: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [checked, scale]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggle();
  };

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={checked ? 'Mark as not done' : 'Mark as done'}
      hitSlop={10}
      onPress={handlePress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Animated.View
        style={[
          styles.base,
          {
            borderColor: checked ? t.accent : t.hairline,
            backgroundColor: checked ? t.accent : 'transparent',
            transform: [{ scale }],
          },
        ]}>
        {checked ? <Ionicons name="checkmark" size={14} color={t.badgeText} /> : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
