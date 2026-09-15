import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { IoniconName } from '@/types/trip';

interface FieldWrapProps {
  label: string;
  icon: IoniconName;
  error?: string;
  children: React.ReactNode;
}

function FieldWrap({ label, icon, error, children }: FieldWrapProps) {
  const t = useTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: t.background, borderColor: error ? t.danger : t.hairline },
        ]}>
        <Ionicons name={icon} size={18} color={t.icon} />
        {children}
      </View>
      {error ? <Text style={[styles.error, { color: t.danger }]}>{error}</Text> : null}
    </View>
  );
}

interface TextFieldProps extends TextInputProps {
  label: string;
  icon: IoniconName;
  error?: string;
}

export function TextField({ label, icon, error, style, ...rest }: TextFieldProps) {
  const t = useTheme();

  return (
    <FieldWrap label={label} icon={icon} error={error}>
      <TextInput
        placeholderTextColor={t.placeholder}
        style={[styles.input, { color: t.text }, style]}
        {...rest}
      />
    </FieldWrap>
  );
}

interface DateFieldProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  icon?: IoniconName;
  error?: string;
}

/** Labeled date field that opens the native date picker. */
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  icon = 'calendar',
  error,
}: DateFieldProps) {
  const t = useTheme();
  const [show, setShow] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'ios') {
      setShow(false);
    }
    if (event.type === 'set' && selected) {
      onChange(selected);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text>
      <Pressable
        onPress={() => setShow(true)}
        style={({ pressed }) => [
          styles.inputWrap,
          {
            backgroundColor: t.background,
            borderColor: error ? t.danger : t.hairline,
            opacity: pressed ? 0.7 : 1,
          },
        ]}>
        <Ionicons name={icon} size={18} color={t.icon} />
        <Text style={[styles.input, { color: t.text }]}>{formatDate(value)}</Text>
        <Ionicons name="chevron-down" size={16} color={t.icon} />
      </Pressable>
      {error ? <Text style={[styles.error, { color: t.danger }]}>{error}</Text> : null}
      {show ? (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.small,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: FontSize.label,
    fontWeight: '600',
    padding: 0,
  },
  error: {
    fontSize: FontSize.small,
    marginLeft: Spacing.xs,
  },
});
