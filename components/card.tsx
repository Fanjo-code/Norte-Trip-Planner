import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { CardShadow, Radius, Spacing } from '@/constants/theme';

interface CardProps extends ViewProps {
  /** Adds a soft elevation shadow to lift the card off the background. */
  elevated?: boolean;
}

export function Card({ elevated = false, style, children, ...rest }: CardProps) {
  const t = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: t.card,
          borderColor: t.hairline,
          borderRadius: Radius.lg,
        },
        elevated ? CardShadow : undefined,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
});
