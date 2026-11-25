# Atlas Social Club

A playful geography game: find countries on an illustrated pastel map, spot flags
and hop between capitals. No sign-up; progress is saved in the browser.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | Unit tests (dataset integrity, progress, daily helpers) |
| `npm run data` | Regenerate the country dataset, map files, flags, map artwork and the open-sea spots for the game map's boats, whales and clouds |
| `npm run shots` | Screenshot the built site with local Chrome (start `npx vite preview --port 4173` first) |
| `npm run a11y` | Accessibility audit (axe-core, WCAG 2.1 AA) of every page, including states after interacting (set `BASE_URL`) |
| `npm run e2e` | Map check with local Chrome: every country clickable in every view, then a full 197-country game with real clicks (set `BASE_URL`, e.g. `http://localhost:5173`; `SKIP_GAME=1` for the quick part only) |

## How it's organised

```
scripts/                 build-time data + artwork (not shipped)
  build-data.mjs         merges countries, capitals, regions, map shapes, flags; fails on bad data
  capitals.overrides.mjs curated notes for countries with special capital arrangements
  build-art.mjs          draws the illustrated pastel world map
src/
  styles/                design tokens (colours, type, shadows) and base styles
  components/ui/         Button, Frame, Chip, Ticket, Stamp, icons
  components/layout/     header, footer, page layout
  data/                  generated countries.json + typed helpers
  progress/              localStorage progress store and derived stats
  lib/                   daily voyage numbering, seeded random, formatting
  map/                   map data loading, region views, the zoomable WorldMap component,
                         sea decorations per view (decor.json, from scripts/build-decor.mjs)
  features/map-hunt/     Map Hunt game: rules engine (engine.ts) + page
  quiz/                  shared multiple-choice engine: question generation by difficulty,
                         look-alike flags (lookalikes.ts), capital questions + trap cities
                         (capitals.ts), round hook (useQuizRound.ts), shared screen parts
  features/flags/        Flag Spotter: start screen, quiz (both modes), stamp album
  features/capitals/     Capital Hop: start screen, quiz (both directions), departures board
  features/dare/         Today's dare ("Bet you can't find ___"): one country, three tries,
                         win card, then an invitation to that continent's Map Hunt
  features/daily/        Today's voyage: five seeded stops a day (voyage.ts) + page
  features/passport/     My Passport: rank, stats, your atlas, best times, voyage stamps, reset
  features/home/         homepage
  features/stub/         placeholder pages for games still to come
public/
  data/                  Natural Earth map shapes (TopoJSON)
  flags/                 197 SVG flags
  art/                   generated homepage map
```

## Data

- **Countries:** the 193 UN members plus Vatican City, Palestine, Kosovo and Taiwan (197),
  from [mledoze/countries](https://github.com/mledoze/countries).
- **Capitals:** from the same dataset, with curated corrections for countries with
  more than one capital or a disputed one (see `scripts/capitals.overrides.mjs`).
- **Regions:** Central America and the Caribbean count as North America; Russia and
  Türkiye appear in both Europe and Asia.
- **Map:** [Natural Earth](https://www.naturalearthdata.com/) 1:50m via `world-atlas`.
  Countries under 2,600 km² also get a tap marker; Tuvalu is marker-only.
- **Flags:** [flag-icons](https://github.com/lipis/flag-icons).
- **Fonts:** Fraunces, Figtree, Nunito and Caveat, bundled with the site through
  [Fontsource](https://fontsource.org) (no requests to Google at runtime).

## Accessibility

- Every page passes an axe-core WCAG 2.1 AA audit (`npm run a11y`).
- Map Hunt and the daily map stop can be played by keyboard: Tab to the map,
  arrow keys move between countries, Enter chooses (names are never read out,
  so it stays a fair game).
- Timed games (Map Hunt, today's dare) pause when you switch tabs or leave the page
  untouched for a minute; the map is hidden until you choose "Carry on".
- Quizzes: keys 1–4 answer, Enter moves on. Motion is reduced for people who
  ask their system for it (no confetti, no animated borders).

## Design

Pastel voyage: paper and plum ink, one pastel per continent, coral for actions,
double-rule vintage frames with hard offset shadows. The game map is a soft
watercolour chart: pale blue sea with colour washes and a paper grain, cream
countries to find, sage-green neighbours, boats, a whale and clouds, framed in
sage with hills round the bottom corners. Map Hunt hides the site header so the
map gets the screen. Type: Fraunces (soft, wonky cut)
for headings, Nunito for text, Caveat for handwritten notes.
