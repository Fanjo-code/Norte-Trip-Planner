const DAY_MS = 86_400_000;
export function groupThousands(value: number) {
  return Math.round(value).toLocaleString('en-GB');
}
export function formatPrice(value: number | null | undefined, currency: 'EUR' = 'EUR') {
  return value == null
    ? 'Price varies'
    : new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(value);
}
export function localISO(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
export function parseDate(value: string) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
export function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
export function formatDateRange(start: Date, end: Date) {
  return `${formatDate(start)} – ${formatDate(end)}, ${end.getFullYear()}`;
}
export function daysBetween(start: Date, end: Date) {
  return Math.max(
    1,
    Math.round(
      (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
        DAY_MS,
    ) + 1,
  );
}
export function nightsBetween(start: Date, end: Date) {
  return daysBetween(start, end) - 1;
}
export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
