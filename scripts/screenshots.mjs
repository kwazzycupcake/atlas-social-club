// Takes screenshots of the built site with the locally installed Chrome.
// Usage: npm run build && npx vite preview --port 4173 & npm run shots
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = 'screenshots';
fs.mkdirSync(OUT, { recursive: true });

// A sample journey so the "with progress" shots show filled-in states.
const SAMPLE = {
  version: 1,
  found: { FRA: 1, DEU: 1, ITA: 1, ESP: 1, PRT: 1, GBR: 1, KEN: 1, EGY: 1, BRA: 1, PER: 1, JPN: 1, IND: 1, USA: 1, CAN: 1, AUS: 1 },
  bestTimes: { 'south-america': 54_000, europe: 188_000 },
  answers: { correct: 21, total: 25 },
  streak: { current: 4, best: 6, lastDay: null },
  bestRounds: { 'flags:guess': { correct: 17, total: 20, scope: 'europe', level: 'medium', at: 1 }, 'capitals:to-capital': { correct: 14, total: 20, scope: 'world', level: 'easy', at: 1 } },
  misses: { map: { BDI: 3, SWZ: 2 }, flags: { TCD: 2 }, capitals: { CHE: 1 } },
  daily: {},
};

const shots = [
  { name: 'home-desktop', path: '/', width: 1440, height: 900, full: true },
  { name: 'home-desktop-progress', path: '/', width: 1440, height: 900, full: true, progress: true },
  { name: 'home-phone', path: '/', width: 390, height: 844, full: true, progress: true },
  { name: 'map-hunt-picker', path: '/map-hunt', width: 1440, height: 900, full: true, progress: true },
  { name: 'map-hunt-game', path: '/map-hunt/europe', width: 1440, height: 900, progress: true },
  { name: 'map-hunt-phone', path: '/map-hunt/south-america', width: 390, height: 844 },
  { name: 'flag-spotter', path: '/flag-spotter', width: 1440, height: 900, full: true },
  { name: 'flag-quiz', path: '/flag-spotter/guess?region=europe&level=hard', width: 1440, height: 900 },
  { name: 'flag-album', path: '/flag-spotter/album', width: 1440, height: 900, progress: true },
  { name: 'capital-hop', path: '/capital-hop', width: 1440, height: 900, full: true },
  { name: 'capital-quiz', path: '/capital-hop/to-capital?region=oceania&level=hard', width: 1440, height: 900 },
  { name: 'departures-board', path: '/capital-hop/board', width: 1440, height: 900, progress: true },
  { name: 'daily', path: '/daily', width: 1440, height: 900 },
  { name: 'passport', path: '/passport', width: 1440, height: 900, full: true, progress: true },
  { name: 'passport-phone', path: '/passport', width: 390, height: 844, full: true, progress: true },
  { name: 'notfound-phone', path: '/nowhere', width: 390, height: 844 },
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const errors = [];
for (const s of shots) {
  const context = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${s.name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${s.name}: ${m.text()}`));
  if (s.progress) {
    await page.addInitScript((p) => localStorage.setItem('atlas-social-club:progress', JSON.stringify(p)), SAMPLE);
  }
  await page.goto(BASE + s.path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) errors.push(`${s.name}: page is ${overflow}px wider than the viewport`);
  await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: Boolean(s.full) });
  await context.close();
  console.log(`saved ${OUT}/${s.name}.png`);
}
await browser.close();
if (errors.length) {
  console.error('Problems:\n - ' + errors.join('\n - '));
  process.exit(1);
}
