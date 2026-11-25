// Local progress, saved in localStorage. No account needed.
// Phase 1 reads it for the homepage; later phases record into it.
import { useSyncExternalStore } from 'react';
import { COUNTRIES, type RegionId } from '../data/countries';
import { dayKey } from '../lib/daily';

const KEY = 'atlas-social-club:progress';
const VERSION = 1;

export interface Progress {
  version: number;
  /** country code → first time it was found on the map (ms since epoch) */
  found: Record<string, number>;
  /** best full-region time in ms, per region or the world */
  bestTimes: Partial<Record<RegionId | 'world', number>>;
  answers: { correct: number; total: number };
  streak: { current: number; best: number; lastDay: string | null };
  /** best round per quiz mode, e.g. "flags:guess" */
  bestRounds: Record<string, RoundRecord>;
  /** countries you most recently got wrong, per game (cleared when you get them right) */
  misses: Record<MissKind, Record<string, number>>;
  /** finished daily voyages, keyed by local day ("2026-11-21") */
  daily: Record<string, DailyRecord>;
  /** the homepage dare, keyed by local day */
  dares: Record<string, DareRecord>;
}

export type MissKind = 'map' | 'flags' | 'capitals';

export interface RoundRecord {
  correct: number;
  total: number;
  /** where and how hard, e.g. "europe" + "hard" */
  scope: string;
  level: string;
  at: number;
}

export interface DareRecord {
  code: string;
  found: boolean;
  /** wrong taps before finding it (3 = revealed) */
  misses: number;
  /** time taken, ms */
  ms: number;
}

export interface DailyRecord {
  edition: number;
  /** 0–3 stars per stop, in order */
  stars: number[];
  finishedAt: number;
}

export const emptyProgress = (): Progress => ({
  version: VERSION,
  found: {},
  bestTimes: {},
  answers: { correct: 0, total: 0 },
  streak: { current: 0, best: 0, lastDay: null },
  bestRounds: {},
  misses: { map: {}, flags: {}, capitals: {} },
  daily: {},
  dares: {},
});

function read(): Progress {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return emptyProgress();
    const parsed = JSON.parse(text) as Partial<Progress>;
    if (parsed.version !== VERSION) return emptyProgress();
    const base = emptyProgress();
    return { ...base, ...parsed, misses: { ...base.misses, ...parsed.misses } };
  } catch {
    return emptyProgress(); // private mode, blocked storage or corrupt JSON
  }
}

let current: Progress = typeof window === 'undefined' ? emptyProgress() : read();
const listeners = new Set<() => void>();

export function getProgress(): Progress {
  return current;
}

export function updateProgress(change: (p: Progress) => Progress) {
  current = change(current);
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* storage unavailable: keep progress for this visit only */
  }
  listeners.forEach((l) => l());
}

export function resetProgress() {
  updateProgress(() => emptyProgress());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = read();
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, emptyProgress);
}

/* ---------- recording play ---------- */

function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

/** Count today towards the streak (once per day). */
function withStreak(p: Progress, now: Date): Progress {
  const today = dayKey(now);
  if (p.streak.lastDay === today) return p;
  const current = p.streak.lastDay === previousDay(today) ? p.streak.current + 1 : 1;
  return { ...p, streak: { current, best: Math.max(p.streak.best, current), lastDay: today } };
}

/** The streak shown to the player: it lapses if yesterday was missed. */
export function liveStreak(p: Progress, now = new Date()): number {
  const today = dayKey(now);
  return p.streak.lastDay === today || p.streak.lastDay === previousDay(today) ? p.streak.current : 0;
}

/** Adds or clears a country on the "worth another look" list. */
function withMiss(p: Progress, kind: MissKind, code: string, missed: boolean, now: Date): Progress {
  const list = { ...p.misses[kind] };
  if (missed) list[code] = now.getTime();
  else if (list[code]) delete list[code];
  else return p;
  return { ...p, misses: { ...p.misses, [kind]: list } };
}

/** A country found on the map. */
export function recordFound(code: string, now = new Date()) {
  updateProgress((p) =>
    withStreak(
      {
        ...withMiss(p, 'map', code, false, now),
        found: p.found[code] ? p.found : { ...p.found, [code]: now.getTime() },
        answers: { correct: p.answers.correct + 1, total: p.answers.total + 1 },
      },
      now,
    ),
  );
}

/** A country not found on the map (revealed or skipped). */
export function recordMissed(code: string, now = new Date()) {
  updateProgress((p) => ({ ...withMiss(p, 'map', code, true, now), answers: { ...p.answers, total: p.answers.total + 1 } }));
}

/** A multiple-choice answer about a country's flag or capital. */
export function recordAnswer(kind: 'flags' | 'capitals', code: string, correct: boolean, now = new Date()) {
  updateProgress((p) => {
    const q = withMiss(p, kind, code, !correct, now);
    if (!correct) return { ...q, answers: { ...p.answers, total: p.answers.total + 1 } };
    return withStreak({ ...q, answers: { correct: p.answers.correct + 1, total: p.answers.total + 1 } }, now);
  });
}

/** Saves today's voyage (once per day; a second finish never overwrites). */
export function recordDaily(day: string, record: DailyRecord) {
  updateProgress((p) => (p.daily[day] ? p : withStreak({ ...p, daily: { ...p.daily, [day]: record } }, new Date(record.finishedAt))));
}

/** Saves today's dare (once per day). */
export function recordDare(day: string, record: DareRecord) {
  updateProgress((p) => (p.dares[day] ? p : { ...p, dares: { ...p.dares, [day]: record } }));
}

/** Consecutive days with a finished voyage, ending today or yesterday. */
export function voyageStreak(p: Progress, now = new Date()): number {
  let day = dayKey(now);
  if (!p.daily[day]) day = previousDay(day);
  let n = 0;
  while (p.daily[day]) {
    n++;
    day = previousDay(day);
  }
  return n;
}

/** A better round: more of it right (as a share), then the longer round. */
export const isBetterRound = (a: RoundRecord, b?: RoundRecord) =>
  !b || a.correct * b.total > b.correct * a.total || (a.correct * b.total === b.correct * a.total && a.total > b.total);

/** Saves a finished quiz round; returns true when it's a new best for that mode. */
export function recordRound(key: string, round: RoundRecord): boolean {
  if (!isBetterRound(round, getProgress().bestRounds[key])) return false;
  updateProgress((p) => ({ ...p, bestRounds: { ...p.bestRounds, [key]: round } }));
  return true;
}

/** Most recent misses first, e.g. for "worth another look". */
export const recentMisses = (p: Progress, kind: MissKind, limit = 8) =>
  Object.entries(p.misses[kind])
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([code]) => code);

/** Saves a finished run's time; returns true when it beats the previous best. */
export function recordTime(region: RegionId | 'world', ms: number): boolean {
  const prev = getProgress().bestTimes[region];
  if (prev !== undefined && prev <= ms) return false;
  updateProgress((p) => ({ ...p, bestTimes: { ...p.bestTimes, [region]: ms } }));
  return true;
}

/* ---------- derived values ---------- */

/** Ranks go up with the countries you've found on the map: no points involved. */
export const RANKS = [
  { name: 'Deckhand', at: 0 },
  { name: 'Navigator', at: 10 },
  { name: 'Cartographer', at: 30 },
  { name: 'Captain', at: 60 },
  { name: 'Explorer', at: 100 },
  { name: 'Globetrotter', at: 150 },
] as const;

export function rankOf(p: Progress) {
  const found = Object.keys(p.found).length;
  let i = 0;
  while (i + 1 < RANKS.length && found >= RANKS[i + 1].at) i++;
  const next = RANKS[i + 1] ?? null;
  // how far you are from this rank to the next one (full at the top rank)
  const span = next ? next.at - RANKS[i].at : 1;
  const into = next ? found - RANKS[i].at : 1;
  return { rank: RANKS[i].name, index: i, found, into, span, next: next && { rank: next.name, at: next.at, toGo: next.at - found } };
}

export function foundByRegion(p: Progress): Record<RegionId, { found: number; total: number }> {
  const out = {} as Record<RegionId, { found: number; total: number }>;
  for (const c of COUNTRIES) {
    for (const r of c.continents) {
      out[r] ??= { found: 0, total: 0 };
      out[r].total += 1;
      if (p.found[c.code]) out[r].found += 1;
    }
  }
  return out;
}

export function accuracy(p: Progress): number | null {
  return p.answers.total === 0 ? null : Math.round((p.answers.correct / p.answers.total) * 100);
}
