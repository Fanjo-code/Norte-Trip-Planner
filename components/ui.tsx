import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import type { ReactNode } from 'react';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { IoniconName } from '@/types/trip';
export function Eyebrow({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2.2,
        textTransform: 'uppercase',
        color: t.textSecondary,
      }}
    >
      {children}
    </Text>
  );
}
export function Heading({ children, large = false }: { children: ReactNode; large?: boolean }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontFamily: Fonts.serif,
        fontSize: large ? (width < 600 ? 36 : 46) : 30,
        lineHeight: large ? (width < 600 ? 43 : 54) : 38,
        color: t.text,
        letterSpacing: -1.1,
      }}
    >
      {children}
    </Text>
  );
}
export function Body({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={{ fontSize: 14, lineHeight: 23, color: t.textSecondary }}>{children}</Text>;
}
export function Action({
  label,
  onPress,
  icon,
  subtle = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IoniconName;
  subtle?: boolean;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: subtle ? t.accentSoft : t.accent,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ color: subtle ? t.accent : t.badgeText, fontSize: 13, fontWeight: '600' }}>
        {label}
      </Text>
      {icon && <Ionicons name={icon} color={subtle ? t.accent : t.badgeText} size={16} />}
    </Pressable>
  );
}
export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: t.hairline,
          padding: 24,
          gap: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Pill({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      disabled={!onPress}
      style={{
        paddingHorizontal: 15,
        minHeight: onPress ? 44 : undefined,
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: active ? t.accent : t.card,
        borderWidth: 1,
        borderColor: active ? t.accent : t.hairline,
      }}
    >
      <Text
        style={{ color: active ? t.badgeText : t.textSecondary, fontSize: 12, fontWeight: '600' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Panel style={{ alignItems: 'center', paddingVertical: 48 }}>
      <Eyebrow>A little room for discovery</Eyebrow>
      <Heading>{title}</Heading>
      <Body>{description}</Body>
      {action}
    </Panel>
  );
}
export function ProgressBar({ value }: { value: number }) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(Math.max(0, Math.min(1, value)) * 100),
      }}
      style={{ height: 5, borderRadius: 3, backgroundColor: t.hairline, overflow: 'hidden' }}
    >
      <View
        style={{
          height: 5,
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          backgroundColor: t.accent,
          borderRadius: 3,
        }}
      />
    </View>
  );
}
