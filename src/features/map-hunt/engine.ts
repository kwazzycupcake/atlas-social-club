// Map Hunt rules, as a pure reducer (no timers, no storage) so they are easy to test.
//
//  - Countries in the chosen region come up in random order.
//  - Three tries each; we note whether you got it first, second or third time.
//  - Three misses reveal the country; you can also skip. No points: what
//    counts is how many you found, and how fast.
import type { ViewId } from '../../map/views';

export type Outcome = 'first' | 'second' | 'third' | 'revealed' | 'skipped';
export type Phase = 'asking' | 'correct' | 'revealed' | 'finished';
export type Mode = 'timed' | 'practice';

export const MAX_TRIES = 3;
const BY_MISSES: Outcome[] = ['first', 'second', 'third'];

export interface GameState {
  region: ViewId;
  mode: Mode;
  order: string[];
  index: number;
  /** wrong taps on the current country */
  misses: number;
  /** the last wrongly tapped country, for "That's Chad" feedback */
  lastWrong: string | null;
  outcomes: Record<string, Outcome>;
  taps: number;
  phase: Phase;
  startedAt: number;
  finishedAt: number | null;
  /** set while the player is away; the clock doesn't run */
  pausedAt: number | null;
}

export type Action =
  | { type: 'start'; region: ViewId; mode: Mode; order: string[]; now: number; headStart?: HeadStart | null }
  | { type: 'pick'; code: string }
  | { type: 'next'; now: number }
  | { type: 'skip'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number };

/** A country already answered before the round began (the homepage dare). */
export interface HeadStart {
  code: string;
  outcome: Outcome;
  /** time already spent on it, so the clock stays honest */
  ms: number;
}

export function initialState(region: ViewId, mode: Mode, order: string[], now: number, headStart?: HeadStart | null): GameState {
  const base: GameState = {
    region,
    mode,
    order,
    index: 0,
    misses: 0,
    lastWrong: null,
    outcomes: {},
    taps: 0,
    phase: order.length ? 'asking' : 'finished',
    startedAt: now,
    finishedAt: order.length ? null : now,
    pausedAt: null,
  };
  if (!headStart || order[0] !== headStart.code) return base;
  // the head-start country is question 1, already answered
  const done = order.length === 1;
  return {
    ...base,
    index: 1,
    outcomes: { [headStart.code]: headStart.outcome },
    startedAt: now - headStart.ms,
    phase: done ? 'finished' : 'asking',
    finishedAt: done ? now : null,
  };
}

export const currentCode = (s: GameState): string | null => s.order[s.index] ?? null;

function advance(s: GameState, now: number): GameState {
  const index = s.index + 1;
  const done = index >= s.order.length;
  // finishing while paused (the last auto-advance) stops the clock where it paused
  const end = s.pausedAt ?? now;
  return { ...s, pausedAt: done ? null : s.pausedAt, index, misses: 0, lastWrong: null, phase: done ? 'finished' : 'asking', finishedAt: done ? end : null };
}

/** Time on the clock: stops at the finish, and while paused. */
export const elapsedMs = (s: GameState, now: number) => Math.max(0, (s.finishedAt ?? s.pausedAt ?? now) - s.startedAt);

export function reducer(s: GameState, a: Action): GameState {
  // no answering while paused (the map is hidden)
  if (s.pausedAt !== null && (a.type === 'pick' || a.type === 'skip')) return s;
  switch (a.type) {
    case 'pause':
      if (s.pausedAt !== null || s.phase === 'finished') return s;
      return { ...s, pausedAt: a.now };

    case 'resume':
      if (s.pausedAt === null) return s;
      // shift the start forward so the time away never counts
      return { ...s, startedAt: s.startedAt + (a.now - s.pausedAt), pausedAt: null };

    case 'start':
      return initialState(a.region, a.mode, a.order, a.now, a.headStart);

    case 'pick': {
      const target = currentCode(s);
      if (!target) return s;
      if (s.phase === 'revealed') return s; // waiting for "Next"
      if (s.phase !== 'asking') return s;
      if (a.code === target) {
        const outcome = BY_MISSES[s.misses];
        return {
          ...s,
          taps: s.taps + 1,
          phase: 'correct',
          lastWrong: null,
          outcomes: { ...s.outcomes, [target]: outcome },
        };
      }
      // Tapping a country you have already found is not a miss.
      if (s.outcomes[a.code] && s.outcomes[a.code] !== 'revealed' && s.outcomes[a.code] !== 'skipped') return { ...s, lastWrong: a.code };
      const misses = s.misses + 1;
      if (misses >= MAX_TRIES) {
        return { ...s, taps: s.taps + 1, misses, lastWrong: a.code, phase: 'revealed', outcomes: { ...s.outcomes, [target]: 'revealed' } };
      }
      return { ...s, taps: s.taps + 1, misses, lastWrong: a.code };
    }

    case 'skip': {
      const target = currentCode(s);
      if (!target || s.phase !== 'asking') return s;
      return { ...s, phase: 'revealed', outcomes: { ...s.outcomes, [target]: 'skipped' } };
    }

    case 'next':
      if (s.phase === 'correct' || s.phase === 'revealed') return advance(s, a.now);
      return s;
  }
}

/* ---------- summaries ---------- */

export function summary(s: GameState) {
  const results = Object.values(s.outcomes);
  const found = results.filter((o) => o !== 'revealed' && o !== 'skipped').length;
  const firstTry = results.filter((o) => o === 'first').length;
  return {
    found,
    firstTry,
    total: s.order.length,
    answered: results.length,
    accuracy: results.length ? Math.round((found / results.length) * 100) : 0,
  };
}

/** Random order, optionally with one country first (the homepage dare). */
export function makeOrder(codes: string[], first?: string | null, random: () => number = Math.random): string[] {
  const out = codes.filter((c) => c !== first);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return first && codes.includes(first) ? [first, ...out] : out;
}
