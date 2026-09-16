import type { Activity, DayPlan, Place, Restaurant, UserPreferences } from '@/types/trip';

const interestHints: Record<string, RegExp> = {
  art: /museum|gallery|artwork/,
  history: /historic|castle|monument|church|museum|cathedral/,
  nature: /park|garden|zoo|viewpoint/,
  architecture: /tower|bridge|church|cathedral|palace/,
  views: /viewpoint|tower|bridge/,
  food: /market/,
  shopping: /market|shop/,
  nightlife: /bar/,
};
function distance(a: Place, b: Place) {
  return Math.hypot(
    (a.lat! - b.lat!) * 111,
    (a.lng! - b.lng!) * 111 * Math.cos((a.lat! * Math.PI) / 180),
  );
}
export function buildItinerary(
  days: number,
  places: Place[],
  restaurants: Restaurant[],
  destination: string,
  prefs: UserPreferences,
): DayPlan[] {
  const perDay = prefs.pace === 'relaxed' ? 2 : prefs.pace === 'packed' ? 5 : 3;
  const score = (p: Place) =>
    prefs.interests.reduce(
      (n, it) => n + (interestHints[it]?.test((p.category + ' ' + p.name).toLowerCase()) ? 1 : 0),
      0,
    );
  const available = [...places].sort((a, b) => score(b) - score(a));
  const dining = restaurants.filter((r) => r.meal === 'Lunch' || r.meal === 'Dinner');
  const pool = dining.filter(
    (r) =>
      r.priceLevel == null ||
      prefs.budget === 'standard' ||
      (prefs.budget === 'budget' ? r.priceLevel <= 2 : r.priceLevel >= 2),
  );
  const meals = pool.length ? pool : dining;
  return Array.from({ length: days }, (_, d) => {
    const selected: Place[] = [];
    if (available.length) selected.push(available.shift()!);
    while (selected.length < perDay && available.length) {
      const last = selected[selected.length - 1];
      let best = 0;
      for (let i = 1; i < available.length; i++)
        if (distance(last, available[i]) < distance(last, available[best])) best = i;
      selected.push(available.splice(best, 1)[0]);
    }
    const activities: Activity[] = selected.map((p, i) => ({
      id: `day-${d + 1}-${p.id}`,
      time: ['09:30', '11:00', '15:00', '16:30', '18:00'][i],
      title: p.name,
      place: p.category,
      placeName: p.name,
      description: p.description,
      icon: p.icon,
      price: p.price,
      lat: p.lat,
      lng: p.lng,
      url: p.url,
      duration: p.timeToSpend,
    }));
    const chosenMeals = new Set<string>();
    for (const [i, time] of ['13:00', '19:30'].entries()) {
      const candidates = meals.filter((r) => !chosenMeals.has(r.id));
      const r = candidates[(d * 2 + i) % Math.max(1, candidates.length)];
      if (r) {
        chosenMeals.add(r.id);
        activities.push({
          id: `day-${d + 1}-meal-${i}-${r.id}`,
          time,
          title: (i === 0 ? 'Lunch' : 'Dinner') + ' at ' + r.name,
          place: r.neighborhood,
          description: r.description,
          icon: 'restaurant-outline',
          price: null,
          lat: r.lat,
          lng: r.lng,
          url: r.url,
        });
      }
    }
    activities.sort((a, b) => a.time.localeCompare(b.time));
    if (!activities.length)
      activities.push({
        id: `day-${d + 1}-free`,
        time: '10:00',
        title: 'A day to make your own',
        place: destination,
        description:
          'Your planned sights are covered. Revisit a favourite or leave room for a spontaneous discovery.',
        icon: 'walk-outline',
        price: null,
      });
    return {
      day: d + 1,
      title:
        d === 0
          ? 'First impressions'
          : selected.length
            ? selected[0].category + ' & local discoveries'
            : 'Leave room for serendipity',
      activities,
    };
  });
}
