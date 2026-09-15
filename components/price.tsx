import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/format';
import { FontSize } from '@/constants/theme';

type PriceSize = 'caption' | 'body' | 'title' | 'huge';

const SIZES: Record<PriceSize, number> = {
  caption: FontSize.caption,
  body: FontSize.body,
  title: FontSize.title,
  huge: FontSize.huge,
};

interface PriceProps {
  value: number;
  currency?: 'EUR';
  size?: PriceSize;
  /** Renders in the muted secondary color instead of the primary text color. */
  muted?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Price({ value, currency = 'EUR', size = 'body', muted = false, style }: PriceProps) {
  const t = useTheme();

  return (
    <Text
      style={[
        { fontSize: SIZES[size], color: muted ? t.textSecondary : t.text, fontWeight: '700' },
        style,
      ]}>
      {formatPrice(value, currency)}
    </Text>
  );
}
