// End-to-end map check with local Chrome. Two parts:
//  1. In every view (world + 6 regions), every playable country can be hit by a
//     real pointer: at the default zoom, or after zooming in on it.
//  2. A full World game played with real mouse clicks: all 197 countries, each
//     on the first try, so the finish card must say 197 found, all first try.
//
// Usage: start the app (npm run dev, or npx vite preview --port 4173), then
//   BASE_URL=http://localhost:5173 npm run e2e
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SKIP_GAME = process.env.SKIP_GAME === '1';
const countries = JSON.parse(fs.readFileSync(new URL('../src/data/countries.json', import.meta.url), 'utf8'));
const byName = new Map(countries.map((c) => [c.name, c.code]));
const VIEWS = ['world', 'africa', 'asia', 'europe', 'north-america', 'south-america', 'oceania'];
const expected = (view) => countries.filter((c) => view === 'world' || c.continents.includes(view)).map((c) => c.code);

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

/** A viewport point where the topmost element belongs to `code`, or null. */
const findPoint = (code) =>
  page.evaluate((code) => {
    const els = [...document.querySelectorAll(`svg[data-view] [data-code="${code}"]`)];
    const box = document.querySelector('svg[data-view]').getBoundingClientRect();
    for (const el of els) {
      // only sample the part of the shape that is on screen (France's bounding
      // box reaches French Guiana, far outside the Europe view)
      const r = el.getBoundingClientRect();
      const l = Math.max(r.left, box.left + 2), t = Math.max(r.top, box.top + 2);
      const rr = Math.min(r.right, box.right - 2), b = Math.min(r.bottom, box.bottom - 2);
      if (rr <= l || b <= t) continue;
      // whole-pixel points (a real mouse can't click 601.35), middle first
      const cx = (l + rr) / 2, cy = (t + b) / 2;
      const pts = [];
      for (let x = Math.ceil(l); x <= Math.floor(rr); x += Math.max(1, Math.floor((rr - l) / 24)))
        for (let y = Math.ceil(t); y <= Math.floor(b); y += Math.max(1, Math.floor((b - t) / 24))) pts.push([x, y]);
      pts.sort((p, q) => Math.hypot(p[0] - cx, p[1] - cy) - Math.hypot(q[0] - cx, q[1] - cy));
      for (const [x, y] of pts) {
        // require the neighbouring pixels to agree too, so we never click a boundary
        const ok = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(
          ([dx, dy]) => document.elementFromPoint(x + dx, y + dy)?.closest('[data-code]')?.getAttribute('data-code') === code,
        );
        if (ok) return [x, y];
      }
    }
    return null;
  }, code);

/** Centre of the biggest on-screen piece of the country (or its marker). */
const centreOf = (code) =>
  page.evaluate((code) => {
    const box = document.querySelector('svg[data-view]').getBoundingClientRect();
    let best = null;
    for (const el of document.querySelectorAll(`svg[data-view] [data-code="${code}"]`)) {
      const pieces = el.tagName === 'path' ? (el.getAttribute('d').match(/M[^M]+/g) ?? []) : [null];
      for (const d of pieces) {
        let r;
        if (d) {
          const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          p.setAttribute('d', d);
          el.parentNode.appendChild(p);
          r = p.getBoundingClientRect();
          p.remove();
        } else r = el.getBoundingClientRect();
        const l = Math.max(r.left, box.left), t = Math.max(r.top, box.top);
        const rr = Math.min(r.right, box.right), b = Math.min(r.bottom, box.bottom);
        const area = (rr - l) * (b - t);
        if (rr > l && b > t && (!best || area > best.area)) best = { area, c: [(l + rr) / 2, (t + b) / 2] };
      }
    }
    return best?.c ?? null;
  }, code);

async function zoomInOn(code) {
  const c = await centreOf(code);
  if (!c) return false;
  await page.mouse.move(c[0], c[1]);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -400);
  await page.keyboard.up('Control');
  await page.waitForTimeout(120);
  return true;
}
const resetZoom = async () => {
  await page.click('button[aria-label="Show the whole map"]');
  await page.waitForTimeout(500);
};

/** Point for `code`, zooming in up to 4 times if needed. Returns [point, zooms]. */
async function reach(code) {
  let p = await findPoint(code);
  let zooms = 0;
  while (!p && zooms < 4) {
    if (!(await zoomInOn(code))) break;
    zooms++;
    p = await findPoint(code);
  }
  return [p, zooms];
}

/* ---------- 1. reachability in every view ---------- */
let failed = 0;
for (const view of VIEWS) {
  await page.goto(`${BASE}/map-hunt/${view}`, { waitUntil: 'load' });
  await page.waitForSelector('svg[data-view] path[data-code]');
  const missingFromMap = [];
  const needZoom = [];
  const unreachable = [];
  for (const code of expected(view)) {
    if (!(await page.$(`svg[data-view] [data-code="${code}"]`))) {
      missingFromMap.push(code);
      continue;
    }
    const [p, zooms] = await reach(code);
    if (!p) unreachable.push(code);
    else if (zooms) needZoom.push(code);
    if (zooms) await resetZoom();
  }
  const bad = missingFromMap.length + unreachable.length;
  failed += bad;
  console.log(
    `${bad ? '✗' : '✓'} ${view.padEnd(14)} ${expected(view).length} countries` +
      (needZoom.length ? ` · ${needZoom.length} need a zoom (${needZoom.join(' ')})` : '') +
      (missingFromMap.length ? ` · NOT ON MAP: ${missingFromMap.join(' ')}` : '') +
      (unreachable.length ? ` · UNREACHABLE: ${unreachable.join(' ')}` : ''),
  );
}

/* ---------- 2. a full World game with real clicks ---------- */
if (!SKIP_GAME) {
  await page.goto(`${BASE}/map-hunt/world`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('svg[data-view] path[data-code]');
  const started = Date.now();
  let asked = 0;
  for (;;) {
    if (await page.$('[role="dialog"]')) break; // finish card is up
    const name = await page.$eval('[class*="tagName"]', (e) => e.textContent).catch(() => null);
    if (!name) break;
    const code = byName.get(name);
    const [p, zooms] = await reach(code);
    if (!p) {
      console.log(`✗ could not reach ${name} during the game`);
      failed++;
      break;
    }
    await page.mouse.click(p[0], p[1]);
    asked++;
    try {
      await page.waitForFunction((n) => document.querySelector('[class*="tagName"]')?.textContent !== n, name, { timeout: 5000 });
    } catch {
      const status = await page.$eval('[role="status"]', (e) => e.textContent).catch(() => '(no feedback)');
      const topmost = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-code]')?.getAttribute('data-code'), p);
      console.log(`✗ stuck on ${name} (${code}) after clicking (${p.map(Math.round)}): topmost=${topmost}, feedback="${status}"`);
      await page.screenshot({ path: 'screenshots/e2e-stuck.png' });
      failed++;
      break;
    }
    if (zooms) await resetZoom();
  }
  const found = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('atlas-social-club:progress')).found).length);
  const finished = await page.$('[role="dialog"]');
  // the finish card's results, e.g. { Found: "197 / 197", "First try": "197" }
  const results = finished
    ? await page.$$eval('[role="dialog"] dl > div', (rows) => Object.fromEntries(rows.map((r) => [r.querySelector('dt')?.textContent, r.querySelector('dd')?.textContent?.replace(/\s+/g, ' ').trim()])))
    : {};
  const firstTry = results['First try'];
  const ok = asked === countries.length && found === countries.length && finished && firstTry === String(countries.length);
  const score = `found ${results.Found ?? '?'}, first try ${firstTry ?? '?'}`;
  if (!ok) failed++;
  console.log(
    `${ok ? '✓' : '✗'} world game: ${asked} countries clicked, ${score}, ${found} saved as found, finish card ${finished ? 'shown' : 'missing'} (${Math.round((Date.now() - started) / 1000)}s)`,
  );
}

await browser.close();
if (errors.length) console.log('Page errors:\n - ' + errors.join('\n - '));
process.exit(failed || errors.length ? 1 : 0);
