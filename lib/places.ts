export const cityKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .split(',')[0]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
export const placeKey = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
export function validCoords(p: { lat?: number; lng?: number }) {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat!) <= 90 &&
    Math.abs(p.lng!) <= 180 &&
    !(p.lat === 0 && p.lng === 0)
  );
}
export function mapsUrl(points: { lat?: number; lng?: number }[]) {
  const valid = points.filter(validCoords);
  if (!valid.length) return 'https://www.google.com/maps';
  if (valid.length === 1)
    return `https://www.google.com/maps/search/?api=1&query=${valid[0].lat},${valid[0].lng}`;
  const coord = (p: (typeof valid)[number]) => `${p.lat},${p.lng}`;
  return (
    'https://www.google.com/maps/dir/?' +
    new URLSearchParams({
      api: '1',
      origin: coord(valid[0]),
      destination: coord(valid[valid.length - 1]),
      waypoints: valid.slice(1, -1).map(coord).join('|'),
      travelmode: 'walking',
    })
  );
}
