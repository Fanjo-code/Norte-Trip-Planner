import { useAppearance } from '@/contexts/appearance-context';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Text, View, Pressable, useWindowDimensions } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { scheme, toggle } = useAppearance();
  const { width } = useWindowDimensions();
  const path = usePathname();
  const home = path === '/' || path === '/index';
  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <View
        style={{
          minHeight: (width > 700 ? 76 : 64) + insets.top,
          paddingTop: insets.top,
          borderBottomWidth: 1,
          borderColor: t.hairline,
          paddingHorizontal: width > 900 ? 48 : 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: t.background,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Norte home"
          onPress={() => router.navigate('/')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44 }}
        >
          <Ionicons name="compass-outline" size={28} color={t.accent} />
          <Text style={{ fontFamily: Fonts.serif, fontSize: 31, color: t.text, letterSpacing: -1 }}>
            norte<Text style={{ color: '#B88355' }}>.</Text>
          </Text>
        </Pressable>
        {width > 700 && (
          <View style={{ flexDirection: 'row', gap: 32, alignItems: 'center' }}>
            <Pressable onPress={() => router.navigate('/')}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: home ? '700' : '500',
                  color: home ? t.accent : t.textSecondary,
                }}
              >
                My journeys
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/preferences')}>
              <Text style={{ fontSize: 13, color: t.textSecondary }}>Travel style</Text>
            </Pressable>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: width > 700 ? 12 : 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={scheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            onPress={toggle}
            style={{
              padding: 10,
              minWidth: 44,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={scheme === 'light' ? 'moon-outline' : 'sunny-outline'}
              size={18}
              color={t.accent}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Plan a trip"
            onPress={() => router.push('/new-trip')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              minHeight: 44,
              paddingVertical: 10,
              paddingHorizontal: 15,
              borderRadius: 8,
              backgroundColor: t.accent,
            }}
          >
            <Ionicons name="add" size={17} color={t.badgeText} />
            {width > 400 && (
              <Text style={{ color: t.badgeText, fontSize: 12, fontWeight: '600' }}>
                Plan a trip
              </Text>
            )}
          </Pressable>
        </View>
      </View>
      {children}
    </View>
  );
}
