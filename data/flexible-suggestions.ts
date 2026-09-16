import type { IoniconName } from '@/types/trip';

export type Priority = 'best-price' | 'low-crowds' | 'recommended';

/**
 * All priority options for flexible-month trip planning.
 * 'best-price' no longer refers to flights — it's the cheapest overall week.
 */
export const PRIORITY_OPTIONS: {
  value: Priority;
  label: string;
  description: string;
  icon: IoniconName;
}[] = [
  {
    value: 'best-price',
    label: 'Best price',
    description: 'Find the cheapest overall week',
    icon: 'pricetag',
  },
  {
    value: 'low-crowds',
    label: 'Low crowds',
    description: 'Avoid peak tourist weeks',
    icon: 'people-outline',
  },
  {
    value: 'recommended',
    label: 'Recommended',
    description: 'Balanced: weather, price, crowds',
    icon: 'star-outline',
  },
];
