// Accessibility audit with axe-core in local Chrome, on every page.
// Usage: BASE_URL=http://localhost:5173 npm run a11y
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PAGES = [
  '/',
  '/map-hunt',
  '/map-hunt/europe',
  '/flag-spotter',
  '/flag-spotter/guess?region=europe&level=medium',
  '/flag-spotter/find?region=africa&level=hard',
  '/flag-spotter/album',
  '/capital-hop',
  '/capital-hop/to-capital?region=world&level=hard',
  '/capital-hop/to-country?region=asia&level=easy',
  '/capital-hop/board',
  '/dare',
  '/daily',
  '/passport',
  '/nowhere',
];

/** Extra states to audit after interacting: answer a question, open a dialog, finish a round. */
const STATES = {
  '/flag-spotter/guess?region=europe&level=medium': async (p) => p.click('button[data-state]'),
  '/flag-spotter/find?region=africa&level=hard': async (p) => p.click('button[data-state]'),
  '/capital-hop/to-capital?region=world&level=hard': async (p) => p.click('button[data-state]'),
  '/map-hunt/europe': async (p) => {
    await p.click('button:has-text("Skip")');
  },
  '/flag-spotter/album': async (p) => p.click('[class*="albumItem"]'),
  '/passport': async (p) => p.click('button:has-text("Reset my progress")'),
};

const runAxe = (page) =>
  page.evaluate(async () => {
    // @ts-expect-error axe is injected
    const r = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ') + (n.any[0]?.message ? ` — ${n.any[0].message}` : '')),
      count: v.nodes.length,
    }));
  });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
let total = 0;
for (const path of PAGES) {
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.addScriptTag({ content: AXE });
  const violations = await runAxe(page);
  if (STATES[path]) {
    await STATES[path](page);
    await page.waitForTimeout(500);
    for (const v of await runAxe(page)) violations.push({ ...v, id: `${v.id} (after interacting)` });
  }
  total += violations.length;
  console.log(`${violations.length ? '✗' : '✓'} ${path}`);
  for (const v of violations) {
    console.log(`   [${v.impact}] ${v.id} (${v.count}): ${v.help}`);
    for (const n of v.nodes) console.log(`      · ${n.slice(0, 200)}`);
  }
}
await browser.close();
process.exit(total ? 1 : 0);
