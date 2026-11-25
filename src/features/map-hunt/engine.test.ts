import { describe, expect, it } from 'vitest';
import { currentCode, elapsedMs, initialState, makeOrder, reducer, summary, type GameState } from './engine';
import { seededRandom } from '../../lib/daily';

const start = (order = ['FRA', 'DEU', 'ITA']) => initialState('europe', 'timed', order, 1000);
const pick = (s: GameState, code: string) => reducer(s, { type: 'pick', code });
const next = (s: GameState, now = 2000) => reducer(s, { type: 'next', now });

describe('Map Hunt rules', () => {
  it('notes first, second and third tries', () => {
    let s = start();
    s = pick(s, 'FRA');
    expect(s.phase).toBe('correct');
    expect(s.outcomes.FRA).toBe('first');

    s = next(s);
    s = pick(s, 'ESP');
    expect(s.misses).toBe(1);
    expect(s.lastWrong).toBe('ESP');
    s = pick(s, 'DEU');
    expect(s.outcomes.DEU).toBe('second');

    s = next(s);
    s = pick(pick(s, 'ESP'), 'PRT');
    s = pick(s, 'ITA');
    expect(s.outcomes.ITA).toBe('third');
    expect(summary(next(s))).toMatchObject({ found: 3, firstTry: 1, total: 3 });
  });

  it('reveals the country after three misses and waits for Next', () => {
    let s = start();
    s = pick(pick(pick(s, 'ESP'), 'PRT'), 'BEL');
    expect(s.phase).toBe('revealed');
    expect(s.outcomes.FRA).toBe('revealed');
    expect(summary(s).found).toBe(0);
    // Taps while revealed do nothing.
    expect(pick(s, 'FRA')).toBe(s);
    s = next(s);
    expect(currentCode(s)).toBe('DEU');
    expect(s.misses).toBe(0);
  });

  it('does not count tapping an already-found country as a miss', () => {
    let s = next(pick(start(), 'FRA'));
    s = pick(s, 'FRA');
    expect(s.misses).toBe(0);
    expect(s.lastWrong).toBe('FRA');
  });

  it('ignores extra taps after a correct answer', () => {
    const s = pick(start(), 'FRA');
    expect(pick(s, 'DEU')).toBe(s);
  });

  it('skips, finishes and summarises', () => {
    let s = start(['FRA', 'DEU']);
    s = next(pick(s, 'FRA'), 1500);
    s = reducer(s, { type: 'skip', now: 1600 });
    expect(s.outcomes.DEU).toBe('skipped');
    s = next(s, 4000);
    expect(s.phase).toBe('finished');
    expect(s.finishedAt).toBe(4000);
    expect(summary(s)).toMatchObject({ found: 1, firstTry: 1, total: 2, accuracy: 50 });
  });
});

describe('head start from the daily dare', () => {
  it('counts the dare as question 1 and keeps its time on the clock', () => {
    const s = initialState('asia', 'timed', ['KHM', 'LAO', 'THA'], 10_000, { code: 'KHM', outcome: 'first', ms: 4_200 });
    expect(s.index).toBe(1);
    expect(currentCode(s)).toBe('LAO');
    expect(s.outcomes).toEqual({ KHM: 'first' });
    expect(s.startedAt).toBe(5_800);
    expect(summary(s)).toMatchObject({ found: 1, total: 3 });
  });

  it('ignores a head start that is not the first question', () => {
    const s = initialState('asia', 'timed', ['LAO', 'KHM'], 0, { code: 'KHM', outcome: 'first', ms: 1 });
    expect(s.index).toBe(0);
    expect(s.outcomes).toEqual({});
  });
});

describe('question order', () => {
  it('includes every country once, and can put the dare first', () => {
    const codes = ['A', 'B', 'C', 'D', 'E'];
    const order = makeOrder(codes, 'D', seededRandom(1));
    expect(order[0]).toBe('D');
    expect([...order].sort()).toEqual(codes);
    expect(makeOrder(codes, 'ZZZ', seededRandom(2)).sort()).toEqual(codes);
  });
});

describe('pausing while away', () => {
  const start = () => initialState('africa', 'timed', ['KEN', 'EGY'], 1_000);

  it('stops the clock while paused and never counts the time away', () => {
    let s = reducer(start(), { type: 'pause', now: 11_000 });
    expect(elapsedMs(s, 999_999)).toBe(10_000);
    s = reducer(s, { type: 'resume', now: 3_611_000 }); // an hour later
    expect(s.pausedAt).toBeNull();
    expect(elapsedMs(s, 3_616_000)).toBe(15_000);
  });

  it('ignores taps and skips while paused', () => {
    const paused = reducer(start(), { type: 'pause', now: 2_000 });
    expect(reducer(paused, { type: 'pick', code: 'KEN' })).toBe(paused);
    expect(reducer(paused, { type: 'skip', now: 3_000 })).toBe(paused);
  });

  it('does not pause a finished game', () => {
    let s = reducer(start(), { type: 'pick', code: 'KEN' });
    s = reducer(s, { type: 'next', now: 2_000 });
    s = reducer(s, { type: 'pick', code: 'EGY' });
    s = reducer(s, { type: 'next', now: 3_000 });
    expect(s.phase).toBe('finished');
    expect(reducer(s, { type: 'pause', now: 4_000 })).toBe(s);
    expect(elapsedMs(s, 99_000)).toBe(2_000);
  });
});
