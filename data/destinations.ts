/**
 * Destination photos via Unsplash (free, no API key).
 * Add more cities as needed — the fallback is a teal gradient.
 */
const IMAGES: Record<string, string> = {
  porto: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&h=500&fit=crop&q=80',
  lisbon: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800&h=500&fit=crop&q=80',
  paris: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=500&fit=crop&q=80',
  madrid: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800&h=500&fit=crop&q=80',
  barcelona:
    'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&h=500&fit=crop&q=80',
  'new york':
    'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=500&fit=crop&q=80',
  rome: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=500&fit=crop&q=80',
  amsterdam:
    'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=500&fit=crop&q=80',
  london: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=500&fit=crop&q=80',
  tokyo: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=500&fit=crop&q=80',
  berlin: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&h=500&fit=crop&q=80',
  prague: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=800&h=500&fit=crop&q=80',
  dublin: 'https://images.unsplash.com/photo-1549918864-48ac978761a4?w=800&h=500&fit=crop&q=80',
  florence: 'https://images.unsplash.com/photo-1543429776-2782f8f3e2b4?w=800&h=500&fit=crop&q=80',
  seville: 'https://images.unsplash.com/photo-1555990538-1f0d74bfba6c?w=800&h=500&fit=crop&q=80',
  istanbul:
    'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&h=500&fit=crop&q=80',
};

/** Returns an Unsplash photo URL for the destination, or null for the fallback gradient. */
export function getDestinationImage(destination: string): string | null {
  const aliases: Record<string, string> = {
    lisboa: 'lisbon',
    roma: 'rome',
    sevilla: 'seville',
    firenze: 'florence',
    'new york city': 'new york',
  };
  const raw = destination.trim().toLowerCase().split(',')[0].trim();
  const key = aliases[raw] ?? raw;
  return IMAGES[key] ?? null;
}
