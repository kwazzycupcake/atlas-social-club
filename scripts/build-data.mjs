// Builds src/data/countries.json, public/data/*.json (map shapes) and
// public/flags/*.svg from open datasets. Run with `npm run data`.
//
//  - Countries: world-countries (mledoze), filtered to the 193 UN members plus
//    Vatican City, Palestine, Kosovo and Taiwan (197 total).
//  - Map: Natural Earth 1:50m via world-atlas (110m for small previews).
//  - Flags: flag-icons (4:3 SVGs).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { neighbors } from 'topojson-client';
import { CAPITAL_OVERRIDES, NAME_OVERRIDES } from './capitals.overrides.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const all = require('world-countries');
const atlas50 = require('world-atlas/countries-50m.json');
const atlas110 = require('world-atlas/countries-110m.json');

const EXTRA = new Set(['VA', 'PS', 'XK', 'TW']);
const SMALL_AREA_KM2 = 2600; // below this, also show a tappable marker

// Map features without an ISO code, or that belong to a country we include.
// Keyed by ISO alpha-2 (Kosovo has no official alpha-3; the dataset uses "UNK").
const FEATURE_BY_NAME = { Kosovo: 'XK', Somaliland: 'SO', 'N. Cyprus': 'CY' };

function continentsOf(c) {
  if (c.cca3 === 'RUS' || c.cca3 === 'TUR') return ['europe', 'asia'];
  switch (c.region) {
    case 'Africa': return ['africa'];
    case 'Asia': return ['asia'];
    case 'Europe': return ['europe'];
    case 'Oceania': return ['oceania'];
    case 'Americas': return [c.subregion === 'South America' ? 'south-america' : 'north-america'];
    default: throw new Error(`No continent for ${c.cca3} (${c.region})`);
  }
}

const geoms50 = atlas50.objects.countries.geometries;
const idsWithShape = new Set(geoms50.map((g) => g.id).filter(Boolean));

const countries = all
  .filter((c) => c.unMember || EXTRA.has(c.cca2))
  .map((c) => {
    const ov = CAPITAL_OVERRIDES[c.cca3] ?? {};
    const name = NAME_OVERRIDES[c.cca3] ?? c.name.common;
    const aliases = [...new Set([c.name.common, c.name.official, ...(c.altSpellings ?? [])])]
      .filter((a) => a !== name && a.length > 3);
    const featureIds = [];
    if (c.ccn3 && idsWithShape.has(c.ccn3)) featureIds.push(c.ccn3);
    for (const [fname, iso2] of Object.entries(FEATURE_BY_NAME)) if (iso2 === c.cca2) featureIds.push(`name:${fname}`);
    return {
      code: c.cca3,
      iso2: c.cca2,
      isoNumeric: c.ccn3 || null,
      name,
      officialName: c.name.official,
      aliases,
      continents: continentsOf(c),
      subregion: c.subregion,
      capitals: ov.capitals ?? c.capital,
      capitalNote: ov.note ?? null,
      notDistractor: ov.notDistractor ?? [],
      skipReverse: Boolean(ov.skipReverse),
      latlng: c.latlng,
      areaKm2: c.area,
      featureIds,
      marker: c.area < SMALL_AREA_KM2 || featureIds.length === 0,
      flag: `/flags/${c.cca2.toLowerCase()}.svg`,
      // The dataset marks Vatican City as a member; it is a UN observer state.
      unMember: c.unMember && c.cca2 !== 'VA',
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// ---- checks: fail loudly rather than ship a wrong atlas ----
const problems = [];
if (countries.length !== 197) problems.push(`expected 197 countries, got ${countries.length}`);
const seen = new Set();
for (const c of countries) {
  for (const key of [c.code, c.iso2]) {
    if (seen.has(key)) problems.push(`duplicate code ${key}`);
    seen.add(key);
  }
  if (!c.capitals?.length) problems.push(`${c.code} has no capital`);
  if (!fs.existsSync(path.join(root, 'node_modules/flag-icons/flags/4x3', `${c.iso2.toLowerCase()}.svg`))) problems.push(`${c.code} has no flag`);
  if (!c.latlng || c.latlng.length !== 2) problems.push(`${c.code} has no coordinates`);
}
for (const code of Object.keys(CAPITAL_OVERRIDES)) if (!countries.some((c) => c.code === code)) problems.push(`override for unknown ${code}`);
if (problems.length) {
  console.error('Data problems:\n - ' + problems.join('\n - '));
  process.exit(1);
}

// ---- map colours: like an atlas, countries that share a border never share a colour ----
const PALETTE = JSON.parse(fs.readFileSync(path.join(root, 'src/map/palette.json'), 'utf8'));
const codeByFeatureKey = new Map();
for (const c of countries) for (const k of c.featureIds) codeByFeatureKey.set(k, c.code);
const featureCode = (g) => codeByFeatureKey.get(g.id) ?? codeByFeatureKey.get(`name:${g.properties?.name}`) ?? null;
const adjacency = new Map(countries.map((c) => [c.code, new Set()]));
neighbors(geoms50).forEach((list, i) => {
  const a = featureCode(geoms50[i]);
  for (const j of list) {
    const b = featureCode(geoms50[j]);
    if (a && b && a !== b) {
      adjacency.get(a).add(b);
      adjacency.get(b).add(a);
    }
  }
});
// Greedy colouring, most-connected countries first; among the allowed colours
// pick the least used so far (keeps the map evenly varied), ties broken by a
// stable hash so the result never changes between builds.
const hash = (s) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
const usage = PALETTE.map(() => 0);
const colorOf = new Map();
for (const c of [...countries].sort((a, b) => adjacency.get(b.code).size - adjacency.get(a.code).size || a.code.localeCompare(b.code))) {
  const taken = new Set([...adjacency.get(c.code)].map((n) => colorOf.get(n)).filter((x) => x !== undefined));
  const options = PALETTE.map((_, i) => i).filter((i) => !taken.has(i));
  if (!options.length) problems.push(`no free colour for ${c.code}`);
  options.sort((x, y) => usage[x] - usage[y] || ((hash(c.code) + x) % PALETTE.length) - ((hash(c.code) + y) % PALETTE.length));
  const pick = options[0] ?? 0;
  colorOf.set(c.code, pick);
  usage[pick]++;
}
for (const c of countries) {
  c.color = colorOf.get(c.code);
  c.neighbors = [...adjacency.get(c.code)].sort();
}
if (problems.length) {
  console.error('Data problems:\n - ' + problems.join('\n - '));
  process.exit(1);
}

// ---- write outputs ----
fs.mkdirSync(path.join(root, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/data/countries.json'), JSON.stringify(countries, null, 1) + '\n');

fs.mkdirSync(path.join(root, 'public/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'public/data/countries-50m.json'), JSON.stringify(atlas50));
fs.writeFileSync(path.join(root, 'public/data/countries-110m.json'), JSON.stringify(atlas110));

fs.mkdirSync(path.join(root, 'public/flags'), { recursive: true });
for (const c of countries) {
  const f = `${c.iso2.toLowerCase()}.svg`;
  fs.copyFileSync(path.join(root, 'node_modules/flag-icons/flags/4x3', f), path.join(root, 'public/flags', f));
}

const markers = countries.filter((c) => c.marker).length;
const noShape = countries.filter((c) => c.featureIds.length === 0).map((c) => c.name);
console.log(`countries: ${countries.length} · markers: ${markers} · marker-only (no shape): ${noShape.join(', ') || 'none'}`);
