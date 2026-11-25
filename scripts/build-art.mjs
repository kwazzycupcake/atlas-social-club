// Draws the illustrated pastel world map used on the homepage
// (public/art/world-pastel.svg): continent pastels, waves, boats, a whale,
// clouds and a compass rose. Run with `npm run data`.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as d3 from 'd3-geo';
import * as topo from 'topojson-client';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const countries = JSON.parse(fs.readFileSync(path.join(root, 'src/data/countries.json'), 'utf8'));
const atlas = require('world-atlas/countries-110m.json');

const INK = '#3B3355';
const WAVE = '#9DBBCB';
export const CONTINENT_HUES = {
  'north-america': ['#B9D7A8', '#A9CC97', '#C6DFB6'],
  'south-america': ['#F7C99A', '#F4BB86', '#F9D5AE'],
  europe: ['#AFC4E2', '#A0B8DB', '#BDCFE8'],
  africa: ['#F9DE9C', '#F6D088', '#FBE6B3'],
  asia: ['#F4B3B0', '#F1A3A2', '#F7C2BE'],
  oceania: ['#CDBFE6', '#BFAFDE', '#D9CDEC'],
};
const NEUTRAL = '#EFE6D3'; // territories not in the game (Greenland, W. Sahara…)

const byNumeric = new Map(countries.filter((c) => c.isoNumeric).map((c) => [c.isoNumeric, c]));
const byName = { Kosovo: 'UNK', Somaliland: 'SOM', 'N. Cyprus': 'CYP' };
function continentOf(f) {
  if (f.id === '643') return 'asia'; // Russia reads better in the Asia hue at world scale
  const c = byNumeric.get(f.id) ?? countries.find((x) => x.code === byName[f.properties.name]);
  return c ? c.continents[0] : null;
}
const hash = (s) => [...String(s)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);

const waves = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${WAVE}" stroke-width="1.6" stroke-linecap="round"><path d="M0 0q5-5 10 0t10 0 10 0"/><path d="M6 7q5-5 10 0t10 0"/></g>`;
const boat = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"><path d="M14 -30v28" fill="none"/><path d="M15 -28l14 24h-14z" fill="#FBF7EE"/><path d="M13 -24l-10 20h10z" fill="#F4B3B0"/><path d="M0 0h32l-5 7H5z" fill="#EE8C7A"/><path d="M14 -30l7 3-7 3" fill="#F2C14E"/><path d="M-4 11q6-4 12 0t12 0 12 0" fill="none" stroke="${WAVE}" stroke-width="1.5" stroke-linecap="round"/></g>`;
const whale = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"><path d="M0 0c0-12 12-18 26-14 9 3 13 9 16 4l6-8c1 6-1 11-4 14 3 1 6 4 6 7-5-2-8-1-10 1-5 7-14 9-24 8C6 11 0 7 0 0z" fill="#AFC4E2"/><circle cx="9" cy="-3" r="1.3" fill="${INK}" stroke="none"/><path d="M14 -16c0-5 2-8 0-12M14 -16c-3-3-6-3-8-1M14 -16c3-3 6-3 8-1" fill="none" stroke="${WAVE}" stroke-linecap="round"/></g>`;
const cloud = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 18c-8 0-10-11-2-13 1-9 13-11 17-4 4-8 18-7 19 3 9-1 12 12 2 14z" fill="#DCE7EE"/></g>`;
const tree = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="1" stroke-linejoin="round"><path d="M6 -16l7 11h-4l5 7H-2l5-7h-4z" fill="#7DB08A"/><path d="M6 2v4" fill="none"/></g>`;
const mountain = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"><path d="M0 0l12-17 7 9 5-5 10 13z" fill="#CDBFE6"/><path d="M8.5 -12l3.5-5 3.5 5-2-1-1.5 2-1.5-2z" fill="#FBF7EE"/></g>`;
function compass(x, y, r) {
  const ray = (a, R, w) => {
    const t = (a * Math.PI) / 180, p = t + Math.PI / 2;
    return `M0 0L${(w * Math.cos(p)).toFixed(1)} ${(w * Math.sin(p)).toFixed(1)}L${(R * Math.cos(t)).toFixed(1)} ${(R * Math.sin(t)).toFixed(1)}L${(-w * Math.cos(p)).toFixed(1)} ${(-w * Math.sin(p)).toFixed(1)}z`;
  };
  let g = `<g transform="translate(${x} ${y})" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round">`;
  g += `<circle r="${r * 0.62}" fill="#FBF7EE"/><circle r="${r * 0.52}" fill="none" stroke-dasharray="2 3"/>`;
  for (const a of [45, 135, 225, 315]) g += `<path d="${ray(a, r * 0.6, r * 0.12)}" fill="#AFC4E2"/>`;
  for (const [a, c] of [[-90, '#EE8C7A'], [0, '#F9DE9C'], [90, '#F9DE9C'], [180, '#F9DE9C']]) g += `<path d="${ray(a, r, r * 0.16)}" fill="${c}"/>`;
  g += `<circle r="${r * 0.07}" fill="${INK}"/>`;
  const L = (t, dx, dy) => `<text x="${dx}" y="${dy}" font-family="Georgia,serif" font-weight="700" font-size="${r * 0.32}" fill="${INK}" stroke="none" text-anchor="middle" dominant-baseline="central">${t}</text>`;
  return g + L('N', 0, -r * 1.25) + L('S', 0, r * 1.25) + L('E', r * 1.25, 0) + L('W', -r * 1.25, 0) + '</g>';
}

const W = 1200, H = 620;
const box = { type: 'MultiPoint', coordinates: [[-170, -56], [180, -56], [-170, 83], [180, 83], [5, -56], [5, 83]] };
const proj = d3.geoEqualEarth().fitExtent([[10, 10], [W - 10, H - 10]], box);
const p = d3.geoPath(proj).digits(1);
const at = (lon, lat, fn, s) => { const [x, y] = proj([lon, lat]); return fn(x.toFixed(1), y.toFixed(1), s); };

const features = topo.feature(atlas, atlas.objects.countries).features.filter((f) => f.id !== '010');
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">`; // transparent: the page paper shows through
svg += [[-150, 22], [-135, -12], [-118, -38], [-42, 32], [-28, 2], [-22, -32], [-45, 50], [72, -12], [92, -36], [58, -30], [0, -46], [-85, -50], [125, -48], [160, -20], [175, 20], [-175, -5]]
  .map(([a, b]) => at(a, b, waves, 1.2)).join('');
for (const f of features) {
  const cont = continentOf(f);
  const fill = cont ? CONTINENT_HUES[cont][hash(f.id ?? f.properties.name) % 3] : NEUTRAL;
  svg += `<path d="${p(f)}" fill="${fill}" stroke="#FFF9EE" stroke-width="0.8" stroke-linejoin="round"/>`;
}
svg += [at(-36, 18, boat, 1.3), at(82, -24, boat, 1.1), at(-16, -44, whale, 1.4), at(-168, -32, cloud, 1.6), at(165, 28, cloud, 1.4),
  at(40, 74, cloud, 1.2), at(-112, 58, tree, 1.4), at(-100, 54, tree, 1.2), at(95, 62, tree, 1.4), at(-66, -18, mountain, 1.3),
  at(86, 30, mountain, 1.2), at(134, -25, tree, 1.2), at(22, -2, tree, 1.1), compass(80, 90, 42)].join('');
svg += '</svg>';

fs.mkdirSync(path.join(root, 'public/art'), { recursive: true });
fs.writeFileSync(path.join(root, 'public/art/world-pastel.svg'), svg);
console.log(`art: world-pastel.svg ${(svg.length / 1024).toFixed(0)} KB`);
