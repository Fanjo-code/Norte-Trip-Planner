const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAY_MS = 86_400_000;

/** 1240 → "1.240" (European thousands separator, no Intl dependency). */
export function groupThousands(value: number): string {
  const sign = value < 0 ? '-' : '';
  const digits = Math.round(Math.abs(value)).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatPrice(value: number, currency: 'EUR' = 'EUR'): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  return `${symbol}${groupThousands(value)}`;
}

/** Date → "Aug 12". */
export function formatDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** Date range → "Aug 12 – Aug 16". */
export function formatDateRange(start: Date, end: Date): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** Inclusive number of days in the range (min 1). */
export function daysBetween(start: Date, end: Date): number {
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  return Math.max(1, days);
}

/** Number of nights (days − 1, min 0). */
export function nightsBetween(start: Date, end: Date): number {
  return Math.max(0, daysBetween(start, end) - 1);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
