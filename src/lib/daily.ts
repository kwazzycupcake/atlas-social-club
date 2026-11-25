// The daily voyage: the same five stops for everyone on a given (local) day.

/** The first voyage. Edition numbers count up from here. */
const LAUNCH = Date.UTC(2026, 10, 21);
const DAY_MS = 86_400_000;

export type StopKind = 'map' | 'flag' | 'capital';
export const DAILY_STOPS: StopKind[] = ['map', 'flag', 'capital', 'flag', 'capital'];

/** "2026-11-21" for the viewer's local calendar day. */
export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function editionNumber(date = new Date()): number {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(1, Math.floor((local - LAUNCH) / DAY_MS) + 1);
}

/** Small, fast, seedable PRNG (mulberry32). Same seed → same sequence. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFor(key: string): number {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Fisher–Yates shuffle driven by a seeded generator (does not mutate the input). */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const rand = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Countries for the homepage dare: "Bet you can't find ___."
 * Hand-picked to be real-but-tricky to place on a map (no Russias), with names
 * short enough for a big headline.
 */
export const DARE_COUNTRIES = [
  'BTN', 'MWI', 'BDI', 'ERI', 'DJI', 'LSO', 'SWZ', 'MDA', 'KGZ', 'TJK', 'TKM', 'LAO', 'BRN', 'TLS',
  'AND', 'LIE', 'SMR', 'MNE', 'SVN', 'MKD', 'SUR', 'GUY', 'PRY', 'URY', 'BLZ', 'HND', 'NIC', 'SLV',
  'BEN', 'TGO', 'BFA', 'GAB', 'GNB', 'SLE', 'LBR', 'GMB', 'RWA', 'BWA', 'NAM', 'ZMB', 'MRT', 'TCD',
  'OMN', 'QAT', 'BHR', 'KWT', 'ARM', 'AZE', 'MNG', 'NPL', 'KHM', 'VUT', 'FJI', 'WSM', 'TON', 'PLW',
  'NRU', 'TUV', 'KIR', 'COM', 'MUS', 'SYC', 'MDV', 'MLT', 'LUX', 'EST', 'LVA', 'LTU', 'SVK',
] as const;

/**
 * Today's dare country code. Walks a fixed shuffled order one step per day,
 * so every country appears once before any repeats, and everyone sees the same
 * one on the same day.
 */
export function dareCountryCode(date = new Date()): string {
  const order = seededShuffle(DARE_COUNTRIES, seedFor('atlas-social-club:dare'));
  return order[(editionNumber(date) - 1) % order.length];
}
