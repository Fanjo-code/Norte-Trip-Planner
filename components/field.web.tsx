import { createElement } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { localISO, parseDate } from '@/lib/format';
import type { IoniconName } from '@/types/trip';
export function TextField({
  label,
  error,
  icon: _,
  ...props
}: TextInputProps & { label: string; error?: string; icon?: IoniconName }) {
  const t = useTheme();
  return (
    <View style={{ gap: 9 }}>
      <Text style={{ fontSize: 12, color: t.text, fontWeight: '600' }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        {...props}
        placeholderTextColor={t.placeholder}
        style={{
          padding: 15,
          borderRadius: 9,
          borderWidth: 1,
          borderColor: error ? t.danger : t.hairline,
          color: t.text,
          backgroundColor: t.background,
          fontSize: 15,
        }}
      />
      {Boolean(error) && <Text style={{ color: t.danger, fontSize: 12 }}>{error}</Text>}
    </View>
  );
}
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  error,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  minimumDate?: Date;
  error?: string;
  icon?: IoniconName;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 9, flex: 1 }}>
      <Text style={{ fontSize: 12, color: t.text, fontWeight: '600' }}>{label}</Text>
      {createElement('input', {
        type: 'date',
        'aria-label': label,
        value: localISO(value),
        min: minimumDate ? localISO(minimumDate) : undefined,
        onChange: (e: { target: { value: string } }) => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) onChange(parseDate(e.target.value));
        },
        style: {
          boxSizing: 'border-box',
          width: '100%',
          minWidth: 0,
          padding: '14px',
          borderRadius: 9,
          border: '1px solid ' + (error ? t.danger : t.hairline),
          background: t.background,
          color: t.text,
          fontFamily: 'inherit',
          fontSize: 15,
          colorScheme: t.background === '#171C16' ? 'dark' : 'light',
        },
      })}
      {Boolean(error) && <Text style={{ color: t.danger, fontSize: 12 }}>{error}</Text>}
    </View>
  );
}
