import { ScrollView, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { useTheme } from '@/hooks/use-theme';
export function Screen({
  children,
  scroll = true,
  style,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const content = (
    <View
      style={[
        {
          width: '100%',
          maxWidth: 1240,
          alignSelf: 'center',
          paddingHorizontal: width > 900 ? 44 : 20,
          paddingTop: 28,
          paddingBottom: 48 + insets.bottom,
          gap: 24,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );
  return (
    <View style={[{ flex: 1, backgroundColor: t.background }, style]}>
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}
