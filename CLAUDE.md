# Norte Trip Planner — contributor guide

Read README.md for setup, capabilities, limitations, and commands.

## Product

Norte is an Expo React Native city-exploration app, with an iPhone target and a fully functional responsive web version. No flights, accommodation, or bookings. Real place data is required; do not introduce fabricated travel records, ratings, prices, or reviews.

The design uses warm ivory, deep olive, editorial serif headings, and restrained cards. Both light and dark modes are supported. Keep product copy plain, approachable, and free of implementation jargon.

Food screen uses visual category cards with Unsplash imagery for Breakfast, Meals (lunch/dinner), and Drinks. Itinerary shows map above activities with simplified cards (title, time, directions only). Places screen shows map with icon pins, no route lines or numbering. Bottom tab bar is compact and tight to the screen bottom on mobile.

## Architecture

- Expo Router root stack: index, new-trip, preferences, (trip).
- Trip tabs: overview (displayed as City guide), itinerary, places, food, journal. Preserve the overview route path.
- Providers: Appearance → navigation theme → Trip → Preferences → CityProgress → Progress.
- Shared components in components/ui.tsx and components/screen.tsx.
- Platform files: field.web.tsx uses a browser date input; route-map.web.tsx loads Leaflet in a browser-only effect with normal tile referrers. Native variants use date-time picker and react-native-maps.
- Map components: RouteMap (itinerary with lines and numbers), PlacesMap (places with pins only, no route lines).
- services/travel.ts fetches live data. lib/itinerary.ts is deterministic and independently testable.
- services/ai.ts calls the local server only. server/lib/ai.mjs can refine writing but must preserve all verified identities and structural data.
- server/lib/http.mjs supplies bounded fetches, request deduplication, and timestamped disk caching.
- server/lib/overpass.mjs uses multiple Overpass API endpoints with fallback. server/lib/fallback-restaurants.mjs provides backup data when APIs fail.
- API routes: /health, /api/geocode, /api/reverse-geocode, /api/places, /api/restaurants, /api/transport, /api/weather, POST /api/ai-plan.

## Persistence

- norte.trips.v1 — trip list; norte.tripdata.v1:{id} — full plans.
- norte.selected.v1 — selected journey.
- norte.done.v1 — trip-scoped completed activity/restaurant IDs.
- norte.cityprogress.v1 — city-scoped visited place names, normalized using Unicode-aware lib/places.ts.
- norte.preferences.v1 — interests, pace, budget.
- norte.appearance.v1 — light/dark.
- norte.note.v1:{id} — private journal note.

Preserve older data where possible. Persist writes in order and guard asynchronous loads against early user edits. Keep city completion at or below 100%. Itinerary landmark check-off adds the visit to the city collection; unchecking the itinerary intentionally retains the city's visit history.

## Planning rules

- Live planning works without credentials; AI editing is explicitly optional.
- Landmark fetch failure gives a retryable error. Dining and transit outages are nonfatal and fall back to static data.
- No weather request should block trip creation.
- Pace: 2 / 3 / 5 sights per day for relaxed / balanced / packed.
- Places remain comprehensive regardless of interests; interests affect itinerary selection.
- Unknown ratings and prices are null; zero price means confirmed free admission.
- Flexible dates are an explicitly displayed scheduling suggestion, not a claim about cheapest dates or crowds.
- Use local calendar dates, not UTC date slicing, for saved travel dates.
- Preserve first and last stops in external map directions. Drawn map lines are visit order only.
- Restaurant categories: Breakfast (cafes), Meals (lunch & dinner combined), Drinks (bars). Same restaurants serve lunch and dinner.

## Credentials

Only EXPO_PUBLIC_PROXY_URL belongs in the client. GROQ_API_KEY, GROQ_MODEL, OMNIROUTE_BASE_URL, OMNIROUTE_API_KEY, and OMNIROUTE_MODEL belong on the Node server. Never bundle credentials into client JavaScript. Do not commit .env or .cache.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build:web
npm run build:ios
```

Use npm run dev for the local complete stack. Use npm run format before committing. Keep .npmrc legacy-peer-deps=true for Expo peer resolution. Do not claim physical-device verification from a successful bundle alone.
