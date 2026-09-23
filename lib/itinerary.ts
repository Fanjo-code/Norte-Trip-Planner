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
  if (![a.lat, a.lng, b.lat, b.lng].every(Number.isFinite)) return 4;
  return Math.hypot(
    (a.lat! - b.lat!) * 111,
    (a.lng! - b.lng!) * 111 * Math.cos((a.lat! * Math.PI) / 180),
  );
}

const paceCount = (prefs: UserPreferences) =>
  prefs.pace === 'relaxed' ? 2 : prefs.pace === 'packed' ? 5 : 3;

function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function schedule(selected: Place[]): Activity[] {
  let cursor = 9 * 60 + 30;
  return selected.map((place, index) => {
    if (index) {
      const km = distance(selected[index - 1], place);
      cursor += Math.min(45, Math.max(15, Math.round(km * 12)));
    }
    if (
      (cursor >= 13 * 60 && cursor < 14 * 60) ||
      (cursor < 13 * 60 && cursor + (place.durationMinutes ?? 60) > 13 * 60)
    )
      cursor = 14 * 60;
    const durationMinutes = place.durationMinutes ?? 60;
    const activity: Activity = {
      id: `place-${place.id}`,
      time: minutesToTime(cursor),
      title: place.name,
      place: place.category,
      placeName: place.name,
      description: place.description,
      icon: place.icon,
      price: place.price,
      lat: place.lat,
      lng: place.lng,
      url: place.url,
      duration: place.timeToSpend,
      durationMinutes,
    };
    cursor += durationMinutes;
    return activity;
  });
}

function titleFor(day: number, selected: Place[]) {
  if (!selected.length) return 'A flexible day';
  return day === 1 ? 'First impressions' : selected[0].category + ' & local discoveries';
}

export function buildItineraryFromSelection(days: Place[][]): DayPlan[] {
  return days.map((selected, index) => ({
    day: index + 1,
    title: titleFor(index + 1, selected),
    activities: schedule(selected),
  }));
}

export function buildItinerary(
  days: number,
  places: Place[],
  _restaurants: Restaurant[],
  _destination: string,
  prefs: UserPreferences,
): DayPlan[] {
  const perDay = paceCount(prefs);
  const score = (place: Place) =>
    prefs.interests.reduce(
      (total, interest) =>
        total +
        (interestHints[interest]?.test((place.category + ' ' + place.name).toLowerCase()) ? 1 : 0),
      0,
    );
  const available = [...places].sort((a, b) => score(b) - score(a));
  const selectedDays: Place[][] = [];
  for (let day = 0; day < days; day++) {
    const selected: Place[] = [];
    if (available.length) selected.push(available.shift()!);
    while (selected.length < perDay && available.length) {
      const last = selected[selected.length - 1];
      let best = 0;
      for (let index = 1; index < available.length; index++)
        if (distance(last, available[index]) < distance(last, available[best])) best = index;
      selected.push(available.splice(best, 1)[0]);
    }
    selectedDays.push(selected);
  }
  return buildItineraryFromSelection(selectedDays);
}
