# Norte Trip Planner

A city travel companion built with Expo and React Native, designed for iPhone and responsive browsers. Warm ivory and olive, editorial typography, quiet layouts, and a personal collection of journeys.

## Start locally

Use Node.js 24 LTS and npm.

```sh
npm install
npm run dev
```

Open **http://localhost:8081** in Chrome. This command starts both Expo and the travel-data server on port 8787. Keep the terminal open while using the app. No API key is needed for live planning.

To run the processes separately:

```sh
npm run proxy
npm run web
```

For a phone, copy `.env.example` to `.env`, set `EXPO_PUBLIC_PROXY_URL` to your computer's LAN address, start `npm run proxy`, then `npm start` and scan with Expo Go. Your phone and computer must be on the same network. Native simulator shortcuts: `npm run ios` / `npm run android`.

## What works

- Create exact-date journeys, or review a suggested Tuesday-start window within a flexible month. Trips support 1–30 days. Flexible dates are a scheduling suggestion, not a price or crowd forecast.
- Save and reopen complete journeys on your device.
- Set interests, pace, and dining style for future trips.
- Explore up to 50 real, deduplicated city landmarks with search, category filters, and visited filters.
- Follow day plans that group nearby sights. Dining suggestions continue across longer trips.
- Use interactive maps on web and native; open correctly ordered walking directions in Google Maps. Map lines indicate visit order, not a calculated walking path.
- Discover local cafés, restaurants, and bars; check off the tables you try.
- Keep city visits across journeys, capped at 100% completion.
- Collect completed activities and places in a journal, with saved private notes.
- Switch between light and dark themes.
- Cancel planning, retry failures, and recover from trips without saved data.

## Data and accuracy

The local server uses Nominatim for city lookup and Overpass/OpenStreetMap for places, dining, and transit. It caches real responses, deduplicates requests, uses bounded timeouts, and has an alternate Overpass endpoint. Saved trip content is readable without a data connection; remote photographs and map tiles still require internet.

Unknown ratings and admission prices stay unknown. Opening hours are shown only when the source includes them. Suggested visit durations are explicitly approximate. The app does not make bookings or check real-time business availability.

A landmark-data failure stops creation with a retry message. Dining/transit failures do not discard an otherwise useful journey. The weather endpoint remains optional and does not block planning.

Free public services can be busy or unavailable. For a public deployment, host the Node server separately and set the client URL to that reachable server before building. Localhost is for local testing.

## Optional AI writing

Add either a Groq key or an OpenAI-compatible OmniRoute endpoint to the **server's** `.env`:

```env
GROQ_API_KEY=your_key
GROQ_MODEL=llama-3.3-70b-versatile
# Or:
OMNIROUTE_BASE_URL=http://localhost:20128/v1
OMNIROUTE_API_KEY=
OMNIROUTE_MODEL=auto/best-free
```

Restart the data server. Trip creation will offer an optional AI travel-writing switch, which sends the itinerary and travel preferences to your configured provider. It refines titles and descriptions while preserving verified names, coordinates, prices, activity IDs, and the day structure. Invalid responses or provider failures keep the live itinerary.

**Never prefix AI credentials with `EXPO_PUBLIC_`.** Only the travel-proxy URL belongs in public client configuration.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build:web
npm run build:ios
```

Tests use Node's built-in test runner and synthetic fixtures only inside `tests/`. They cover calendar dates, Unicode place identity, walking directions, pacing, geographic grouping, long-trip dining, AI validation, partial provider outages, and cancellation.

`npm run format` formats source files. Web output is in `dist/`; iOS bundle verification is in `dist-ios/`. Exporting an iOS bundle does not replace testing on a real iPhone.

The September 2026 verification covered real Porto trip creation (50 landmarks, 22 dining options, and transit), visited-place and dining journal updates, note persistence after reload, and responsive light/dark layouts. iPhone improvements include safe-area spacing, larger controls, stacked date fields on small screens, and automatic keyboard insets. Physical iPhone testing and live AI-provider testing still require a device and provider credentials.

Compatible dependency security patches were applied. `npm audit` still reports moderate transitive advisories involving Expo tooling (`uuid`) and routing (`decode-uri-component`). Its proposed forced fixes downgrade Expo packages incompatibly; keep these under review before a public release. Do not run `npm audit fix --force` blindly.

## Project map

- `app/`: home, trip creation, preferences, and five trip tabs.
- `components/`: visual primitives and platform-specific maps/date controls.
- `contexts/`: device persistence for trips, preferences, progress, city visits, and appearance.
- `lib/`: dates, identity, directions, and deterministic itinerary planning.
- `services/`: client travel requests and optional AI writing.
- `server/`: Node HTTP server and free-data integrations.
- `tests/`: regression tests.

Data is stored locally with AsyncStorage. There is no account or cross-device sync. Deleting a journey removes its itinerary and journal note; your city visits remain.

License: 0BSD.
