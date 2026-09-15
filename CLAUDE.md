# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Norte Trip Planner** is an Expo React Native app for exploring cities with real travel data. It features:

- **File-based routing** with Expo Router (tabs + stack navigation)
- **Two-tier data strategy**: Live data (preferred) → AI itinerary — **no mock data, ever**
- **Per-city completion rate**: check off a city's must-see places and see "I've seen X% of Paris", persisted across trips
- **Personalization**: travelers answer a few profile questions (interests, pace, budget style) that shape their itineraries
- **Offline-first** persistence using AsyncStorage
- **iOS-first** design with dark mode support

> **No flights, no stays.** The app is focused on what to do in a city — the itinerary, the comprehensive Places list, where to eat, and how to get around. Flight and accommodation features were removed entirely (types, services, proxy endpoints, and client UI).

## Architecture

### Frontend (React Native + Expo)
```
app/
├── _layout.tsx          # Root stack: index → new-trip → preferences → (trip) tabs
├── index.tsx            # My Trips list screen (with per-city completion chips)
├── new-trip.tsx         # Trip creation form (exact dates or flexible month)
├── preferences.tsx      # Profile questionnaire: interests, pace, budget style
└── (trip)/              # Tab layout for active trip
    ├── _layout.tsx      # 5 tabs: Guide, Itinerary, Food, Places, Journal
    ├── overview.tsx     # City Guide: hero, completion rate, stats, preferences, quick links
    ├── itinerary.tsx    # Day-by-day timeline with checkable activities
    ├── food.tsx         # Restaurants by meal type with images
    ├── places.tsx       # Comprehensive checkable Places list (per-city completion)
    └── journal.tsx      # Checked-off memories grouped by day
```

Note: the first tab is labeled **"Guide"** but its route file is still `overview.tsx` (many hard-coded `'/(trip)/overview'` paths depend on it).

### Context Providers (State Management)
- **TripProvider** (`contexts/trip-context.tsx`): Manages the trip list, the currently-selected trip, and AI/live trip data via AsyncStorage. Includes `addTrip`/`selectTrip`/`setTripData`/`deleteTrip` and an `isGenerating` flag. On first launch with no saved trips it seeds a default "Porto" trip (destination + dates only — not fabricated travel data).
- **PreferencesProvider** (`contexts/preferences-context.tsx`): The traveler profile — `interests[]`, `pace` ('relaxed'|'balanced'|'packed'), `budget` ('budget'|'standard'|'premium'). Key `norte.preferences.v1`. `hasCustomized` = interests chosen OR a non-default pace/budget.
- **CityProgressProvider** (`contexts/city-progress-context.tsx`): Per-city persisted completion. Key `norte.cityprogress.v1`, shape `Record<cityKey, { seen: string[]; total: number }>`. `cityKey` normalizes "Paris, France" → "paris"; `placeKey` normalizes names (accents stripped) for stable matching across trips; `total` = the largest comprehensive place count ever generated (capped at 50) so "100% of Paris" stays attainable.
- **ProgressProvider** (`contexts/progress-context.tsx`): Tracks check-off per trip for **itinerary activities + restaurants** (NOT places — those live in CityProgress). Computes progress/streaks.

**Provider nesting (order matters, `app/_layout.tsx`):** `ThemeProvider → TripProvider → PreferencesProvider → CityProgressProvider → ProgressProvider`.

### Services
- **`services/ai.ts`**: Generates trips via OmniRoute proxy (OpenAI-compatible API), detailed system prompt for structured JSON output with real coordinates/URLs. Signature `generateTrip(destination, startDate, endDate, prefs?, flexible?)`. Pre-fetches real `/api/geocode`, `/api/restaurants`, `/api/places` to seed the model. The prompt carries an "ABOUT THE TRAVELER" section (interests skew the itinerary but never shrink the comprehensive Places list; pace sets activities/day; budget sets meal-price bands).
- **`services/travel.ts`**: Fetches REAL data from local proxy server (`server/index.mjs`). Includes request deduplication, typed OSM responses, and proper error types (`ProxyError`). `buildItinerary` personalizes by prefs: pace → places/day (relaxed 2 / balanced 3 / packed 4), budget → restaurant price filter, interests → place ordering.

> ⚠️ **Both services export a function named `generateTrip`** but behave differently. `new-trip.tsx` aliases them on import (`generateAITrip` from `ai`, `generateLiveTrip` from `travel`). `ai` **throws** `AiError` (codes `NO_PROXY_URL`, `PROXY_ERROR`, `ALL_MODELS_FAILED`) and returns `GeneratedTrip | null`; `travel` **never throws** — it logs failures and returns `Trip | null`.

### Backend Proxy Server (`server/index.mjs`)
Node.js HTTP server (port 8787) aggregating **free APIs**:
- **Nominatim** (OpenStreetMap) — geocoding
- **Overpass API** — places, restaurants, transport via OSM
- **Open-Meteo** — weather forecast
- **CORS enabled** for Expo Go on LAN
- **In-memory + file cache** (5 min TTL) — response body capture fixed
- Data sources live in `server/lib/`: `geocode.mjs` (Nominatim), `overpass.mjs` (OSM places/restaurants/transport), `weather.mjs` (Open-Meteo). New data sources follow this pattern.

> Flights and hotels were removed: `server/lib/kiwi.mjs`, `amadeus.mjs`, `webflights.mjs`, `webhotels.mjs` are deleted; `/api/hotels`, `/api/flights`, `/api/trip` endpoints are gone. `getHotels` was removed from `overpass.mjs`.

### Data & Types
- **`types/trip.ts`**: Core TypeScript interfaces (Trip, Activity, Restaurant, Place, etc.) plus `Pace`, `BudgetTier`, `UserPreferences`. There is **no** `Flight`, `Accommodation`, or `PriceSource`.
- **`data/destinations.ts`**: Unsplash image URLs for destination hero images
- **`data/flexible-suggestions.ts`**: Only `Priority` + `PRIORITY_OPTIONS` (used by the flexible-month form)
- **No mock data** — there is no `mock-trip.ts`; all trip data is real (live APIs) or AI-generated from real input data

## Key Commands

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Run on iOS simulator (preferred target)
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web

# Start local travel data proxy server (REQUIRED for live data)
npm run proxy

# Typecheck
npx tsc --noEmit

# Lint
npm run lint

# Verify the app bundles cleanly (iOS target)
npx expo export --platform ios
```

> **No test framework is installed.** The project has no unit tests; correctness is verified with `npx tsc --noEmit`, `npm run lint`, and `npx expo export --platform ios`. `scripts/test-proxy.mjs` is a one-off manual probe of the local proxy.

## Development Workflow

> **Install note:** `.npmrc` sets `legacy-peer-deps=true` (required for Expo SDK 57 / npm 12 peer conflicts with `react-native-windows`). Keep it — `npm install` fails without it.

### QR Code Hygiene
When a new Expo Go QR code is generated (e.g., `expo-go-qr.png`), **delete the old one** — keeping multiple QR files in the project root is confusing and unnecessary. Only the most recent should exist.

### Restarting the Proxy After Server Changes
The proxy (port 8787) keeps an in-memory + file response cache. After editing `server/index.mjs` or `server/lib/*.mjs`, restart it and clear stale caches so the app picks up the new code/data:
1. Stop the proxy (Ctrl+C).
2. `rm -f .cache/overpass.json .cache/*.json`
3. `npm run proxy`

### Running the Full Stack
1. **Terminal 1**: `npm run proxy` — starts local data proxy on `http://0.0.0.0:8787`
2. **Terminal 2**: `npm run ios` — starts Expo, opens iOS Simulator

The app reads `EXPO_PUBLIC_PROXY_URL` (defaults to `http://localhost:8787`) to call the proxy. For device testing, update to your machine's LAN IP.

### Environment Variables
Create `.env` in project root (see `.env.example`):
```
# Proxy server
PROXY_PORT=8787

# OmniRoute AI proxy (for AI-generated trips; omit to skip AI tier)
EXPO_PUBLIC_OMNIROUTE_BASE_URL=http://localhost:20128
EXPO_PUBLIC_OMNIROUTE_API_KEY=optional
EXPO_PUBLIC_OMNIROUTE_MODEL=auto/best-free

# Optional primary AI backend (free key from console.groq.com)
EXPO_PUBLIC_GROQ_API_KEY=
EXPO_PUBLIC_GROQ_MODEL=openai/gpt-oss-120b

# Client proxy URL (defaults to localhost for simulator)
EXPO_PUBLIC_PROXY_URL=http://localhost:8787
```

### iOS-First Development
- Optimize for iPhone (primary target)
- Verify builds with `expo export --platform ios`
- Test on iOS Simulator, not Android-first
- System fonts used via `Fonts` in `constants/theme.ts`

## Code Patterns & Conventions

### Theme System
```tsx
import { useTheme } from '@/hooks/use-theme';
// Returns: { text, background, card, accent, hairline, ... }
```
Colors defined in `constants/theme.ts` (light/dark variants with emerald-teal accent).

### Components
- Reusable UI primitives in `components/` (Card, Screen, Field, Button, etc.)
- All themed via `useTheme()` hook
- `Screen` wrapper handles safe areas, scroll, max-width centering
- Platform variants use the RN extension convention, e.g. `route-map.tsx` (native) + `route-map.web.tsx` (web) — a bare `@/components/route-map` import resolves per platform

### Per-City Completion (the "I did 100% of Paris" model)
- The **Places tab is the city's definitive list** — it must stay comprehensive. Personalization never drops famous landmarks from it.
- Checked places come from `useCityProgress()` via **place names**, not IDs (AI place ids are synthetic and unstable across trips): `isPlaceSeen(destination, p.name)` / `togglePlaceSeen(destination, p.name)`.
- Use `currentTripData.destination` (the geocoded city name) for city operations, not the typed destination, where feasible. `cityKey` normalizes either.
- Always `Math.min(…, MAX_CITY_TOTAL)` (50) when computing a city total so an over-generated list can't permanently inflate the bar.

### Data Fetching (no mock data, ever)
1. **Live data** (preferred): `services/travel.ts` → local proxy → free APIs (Overpass/OSM places·restaurants·transport, Open-Meteo weather)
2. **AI generation**: `services/ai.ts` → Groq/OmniRoute proxy → LLM, **seeded with the real live data** so it uses real names/coordinates instead of inventing
- All return `Trip` type with `source: 'live' | 'ai'`; nothing is ever invented to look real

### Persistence
- Trips list: `AsyncStorage` key `norte.trips.v1`
- Per-trip data: `AsyncStorage` key `norte.tripdata.v1:{id}`
- Progress: `AsyncStorage` key `norte.done.v1` (map of tripId → checked item IDs)
- Preferences: `AsyncStorage` key `norte.preferences.v1`
- City progress: `AsyncStorage` key `norte.cityprogress.v1`

### TypeScript
- Strict types in `types/trip.ts`
- Ionicons names typed via `IoniconName` (ComponentProps<typeof Ionicons>['name'])
- OSM responses typed in `services/travel.ts` (`OsmElement`, `ProxyPlacesResponse`, etc.)
- All imports use the `@/` path alias (tsconfig `paths` maps `@/*` → project root), e.g. `import { useTheme } from '@/hooks/use-theme'`

## Proxy API Endpoints
```
GET /api/geocode?q=Porto
GET /api/reverse-geocode?lat=41.15&lng=-8.61
GET /api/places?lat=41.15&lng=-8.61&radius=3000
GET /api/restaurants?lat=41.15&lng=-8.61&radius=2000
GET /api/transport?lat=41.15&lng=-8.61&radius=5000
GET /api/weather?lat=41.15&lng=-8.61&startDate=2026-09-01&endDate=2026-09-05
GET /health
```

## Free Stack Constraint
- All APIs used are **free tiers** (Nominatim, Overpass, Open-Meteo, Unsplash)
- No paid services; the only key is OmniRoute/Groq for AI, server-side only (root `.env`, and `EXPO_PUBLIC_*` vars for the client AI proxy)
- AI via OmniRoute proxy with `auto/best-free` model (Groq as optional primary)

## Adding New Destinations
Add to `data/destinations.ts` IMAGES map with Unsplash URL (free, no key needed).

## Extending the Proxy
Add new endpoints in `server/index.mjs` following existing handler patterns:
1. Create handler function
2. Add case in switch statement
3. Export from appropriate lib module

## Testing on Physical Device
1. Run proxy with `npm run proxy` (binds to 0.0.0.0)
2. Find your LAN IP (`ipconfig` / `ifconfig`)
3. Set `EXPO_PUBLIC_PROXY_URL=http://YOUR_LAN_IP:8787` in `.env` or app config
4. Run `npm run ios` and scan QR with Expo Go (same WiFi)