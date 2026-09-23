# Prompt for Astra / Claude to fix Norte's broken AI trip search

CONTEXT (read these files first — they contain the actual broken code):
- services/ai.ts (client AI fetch to /api/ai-plan; 50 lines; uses EXPO_PUBLIC_GEMINI_URL or default Gemini endpoint; has isAiAvailable + enrichTrip with 120s timeout / abort handling)
- server/lib/ai.mjs (server AI; 115 lines; generates trip plans; must keep verified identities / structural data when refining writing)
- server/lib/http.mjs (bounded fetches / dedup / disk cache — use this instead of raw fetch)
- README.md + CLAUDE.md for setup / verification commands (npm test, npm run typecheck, npm run lint, npm run build:web, npm run build:ios; use npm run dev for full stack)
- services/travel.ts fetches live place data; lib/itinerary.ts is deterministic and independently testable
- API routes: /health, /api/geocode, /api/reverse-geocode, /api/places, /api/restaurants, /api/transport, /api/weather, POST /api/ai-plan

THE PROBLEM (what the user sees):
The front end (Expo Router, trip tabs, map components, cards, bottom tab bar, light/dark mode) is complete and interactive. Only the AI trip generation fails. When a user enters a city (e.g., Moscow), the AI should search for places, restaurants, and build a trip, but it does not return usable results or errors out. The client (services/ai.ts) calls /api/ai-plan; the server (server/lib/ai.mjs) generates the plan. Both files have uncommitted modifications (git status shows M both) and recent commits changed the AI endpoint format (direct Groq, Gemini generateContent, proxy /v1/search). There may be mismatches between the client's expected endpoint format and the server's actual response, missing credentials (only EXPO_PUBLIC_PROXY_URL belongs client-side; GROQ_API_KEY / GROQ_MODEL / OMNIROUTE_BASE_URL / OMNIROUTE_API_KEY / OMNIROUTE_MODEL belong server-side only — never bundle into client JS), or broken fetch/cache logic in server/lib/http.mjs.

WHAT TO DO (step-by-step, minimal changes, reuse existing patterns):
1. Read services/ai.ts and server/lib/ai.mjs fully. Identify what endpoint / format the client expects vs what the server sends.
2. Check server/lib/http.mjs: ensure bounded fetches, request deduplication, and timestamped disk caching work for AI plan requests (do not disable caching — preserve it).
3. Check server/lib/ai.mjs: it can refine writing but must preserve all verified identities (place names, restaurant names, structural itinerary/order) — never invent places, ratings, prices, or reviews (CLAUDE.md rule). Confirm the model / endpoint used matches server-side credentials (GROQ_API_KEY / GROQ_MODEL / OMNIROUTE_* — never put these in client code or commit .env).
4. Verify /api/ai-plan POST works end-to-end with a real city input (use local server from npm run dev; do not claim physical-device verification from bundle alone). Check that /health reports aiConfigured correctly.
5. If the AI call fails, make it retryable (not fatal) — landing page / trip creation must still work without AI (CLAUDE.md: live planning works without credentials; AI editing is explicitly optional). Dining / transit outages are nonfatal and fall back to static data.
6. Keep server/lib/overpass.mjs using overpass-api.de (revert after testing if changed; user explicitly said to revert back to overpass-api.de after testing ends per memory).
7. After fixes, run verification: npm test, npm run typecheck, npm run lint, npm run build:web. Optionally npm run build:ios for iOS-first target.
8. Do NOT fabricate travel records, ratings, prices, reviews (CLAUDE.md). Use live data from services/travel.ts / server endpoints only.
9. Preserve older trip data (norte.trips.v1, norte.tripdata.v1:{id}, norte.selected.v1, norte.done.v1, norte.cityprogress.v1, norte.preferences.v1, norte.appearance.v1, norte.note.v1:{id}) — writes must be ordered and guarded against early user edits.
10. Keep design rules: warm ivory / deep olive / editorial serif headings; compact bottom tab; simplified itinerary cards (title, time, directions only); place map with icon pins (no route lines / numbering); food cards with real Unsplash imagery (Breakfast / Meals / Drinks); flexible dates shown as scheduling suggestion, not cheapest/crowd claim; local calendar dates not UTC slicing.

CONSTRAINTS (hard rules from project — do not violate):
- No fabricated data.
- Credentials server-side only; EXPO_PUBLIC_PROXY_URL client-only.
- No commit of .env or .cache.
- Preserve first and last stops in external map directions; drawn lines = visit order only.
- Restaurant categories: Breakfast (cafes), Meals (lunch & dinner combined), Drinks (bars / Nightcap).
- Pace: 2 / 3 / 5 sights per day (relaxed / balanced / packed).
- City progress normalized with Unicode-aware lib/places.ts; keep at or below 100%.
- Itinerary landmark check-off adds visit to city collection; unchecking intentionally retains city's visit history.
- AI must preserve verified identities / structural data when refining.

DELIVERABLE FORMAT:
Give me the fixed services/ai.ts and server/lib/ai.mjs (or a targeted diff / edit instructions), confirm /api/ai-plan works with a real city input, and state clearly which files changed and why — keep changes minimal, reuse patterns, and end with Co-Authored-By: Claude Code attribution if you commit.
