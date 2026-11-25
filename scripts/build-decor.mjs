// Picks open-sea spots in each Map Hunt view for the watercolour decorations
// (boats, a whale, clouds, waves and soft colour washes), so none of them ever
// sits on land. Writes src/map/decor.json. Run with `npm run data`.
//
// The boxes mirror src/map/views.ts (keep them in step).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as d3 from 'd3-geo';
import * as topo from 'topojson-client';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const atlas = require('world-atlas/countries-110m.json');
const land = topo.feature(atlas, atlas.objects.land);

const VIEWS = {
  world: { box: [-169, -56, 189, 83] },
  africa: { box: [-26, -36, 58, 38] },
  asia: { box: [26, -11, 150, 56] },
  europe: { box: [-25, 34, 45, 71] },
  'north-america': { box: [-170, 6, -52, 74] },
  'south-america': { box: [-92, -56, -30, 13] },
  oceania: { box: [110, -48, 195, 12] },
};

const norm = (lon) => (lon > 180 ? lon - 360 : lon);
const isLand = (lon, lat) => d3.geoContains(land, [norm(lon), lat]);

/** Sea points with open water all round (no land within `clear` degrees). */
function seaPoints([w, s, e, n], clear) {
  const pts = [];
  const step = Math.max(1.5, Math.min(e - w, n - s) / 28);
  for (let lon = w + step; lon < e - step / 2; lon += step) {
    for (let lat = s + step; lat < n - step / 2; lat += step) {
      let ok = true;
      for (const [dx, dy] of [[0, 0], [clear, 0], [-clear, 0], [0, clear], [0, -clear], [clear, clear], [-clear, -clear], [clear, -clear], [-clear, clear]]) {
        if (isLand(lon + dx, lat + dy)) { ok = false; break; }
      }
      if (ok) pts.push([+lon.toFixed(2), +lat.toFixed(2)]);
    }
  }
  return pts;
}

/** Farthest-point picks, so decorations spread out instead of clumping. */
function spread(pool, count, taken = []) {
  const picked = [];
  const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const pool2 = [...pool];
  while (picked.length < count && pool2.length) {
    const all = [...taken, ...picked];
    let best = 0, bestD = -1;
    pool2.forEach((p, i) => {
      const d = all.length ? Math.min(...all.map((q) => dist(p, q))) : -Math.abs(p[1]); // first pick: nearest the equator
      if (d > bestD) { bestD = d; best = i; }
    });
    picked.push(pool2.splice(best, 1)[0]);
  }
  return picked;
}

const out = {};
for (const [id, { box }] of Object.entries(VIEWS)) {
  const span = Math.min(box[2] - box[0], box[3] - box[1]);
  // keep boats and whales off the very edges (and out of the polar seas)
  const [w, s, e, n] = box;
  const inset = [w + (e - w) * 0.08, Math.max(s + (n - s) * 0.1, -50), e - (e - w) * 0.08, Math.min(n - (n - s) * 0.12, 62)];
  const wide = seaPoints(inset, span / 12); // roomy water for boats, whales, clouds
  const any = seaPoints(inset, span / 30); // a little water for waves
  const boats = spread(wide, 2);
  const whales = spread(wide, 1, boats);
  const clouds = spread(wide, 4, [...boats, ...whales]).map((p, i) => [...p, [1.1, 0.85, 1, 0.75][i]]);
  const waves = spread(any, 12, [...boats, ...whales, ...clouds]);
  const washes = spread(seaPoints(box, 0), 7).map((p, i) => [...p, i % 2 ? 'light' : 'deep']);
  out[id] = { boats, whales, clouds, waves, washes };
  console.log(`decor: ${id.padEnd(14)} ${wide.length} roomy sea spots, ${boats.length} boats, ${whales.length} whale, ${clouds.length} clouds, ${waves.length} waves`);
}
fs.writeFileSync(path.join(root, 'src/map/decor.json'), JSON.stringify(out, null, 1) + '\n');
