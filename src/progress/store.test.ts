import { describe, expect, it } from 'vitest';
import {
  accuracy,
  emptyProgress,
  foundByRegion,
  getProgress,
  rankOf,
  liveStreak,
  recordFound,
  recordAnswer,
  recordDare,
  recordMissed,
  recordRound,
  recentMisses,
  recordTime,
  resetProgress,
} from './store';
import { DARE_COUNTRIES, dareCountryCode, editionNumber, seededRandom, seedFor } from '../lib/daily';
import { getCountry } from '../data/countries';
import { formatDuration } from '../lib/format';

describe('progress helpers', () => {
  it('starts empty', () => {
    const p = emptyProgress();
    expect(accuracy(p)).toBeNull();
    expect(rankOf(p)).toMatchObject({ rank: 'Deckhand', found: 0, next: { rank: 'Navigator', toGo: 10 } });
    expect(foundByRegion(p).europe.found).toBe(0);
  });

  it('counts found countries per region', () => {
    const p = { ...emptyProgress(), found: { FRA: 1, RUS: 2, BRA: 3 } };
    const r = foundByRegion(p);
    expect(r.europe.found).toBe(2);
    expect(r.asia.found).toBe(1);
    expect(r['south-america'].found).toBe(1);
  });

  it('ranks you by the countries you have found, not by points', () => {
    const withFound = (n: number) => ({ ...emptyProgress(), found: Object.fromEntries(Array.from({ length: n }, (_, i) => [`C${i}`, 1])) });
    expect(rankOf(withFound(9))).toMatchObject({ rank: 'Deckhand', into: 9, span: 10, next: { toGo: 1 } });
    expect(rankOf(withFound(10)).rank).toBe('Navigator');
    expect(rankOf(withFound(45))).toMatchObject({ rank: 'Cartographer', into: 15, span: 30 });
    expect(rankOf(withFound(197))).toMatchObject({ rank: 'Globetrotter', next: null });
  });

  it('works out accuracy', () => {
    expect(accuracy({ ...emptyProgress(), answers: { correct: 7, total: 8 } })).toBe(88);
  });
});

describe('recording play', () => {
  it('records finds, accuracy and a daily streak', () => {
    resetProgress();
    recordFound('FRA', new Date(2026, 10, 20, 10));
    recordFound('FRA', new Date(2026, 10, 20, 11)); // same day, same country
    recordMissed('ESP');
    let p = getProgress();
    expect(Object.keys(p.found)).toEqual(['FRA']);
    expect(p.answers).toEqual({ correct: 2, total: 3 });
    expect(p.streak).toMatchObject({ current: 1, lastDay: '2026-11-20' });

    recordFound('DEU', new Date(2026, 10, 21, 9)); // next day: streak grows
    expect(getProgress().streak.current).toBe(2);
    expect(liveStreak(getProgress(), new Date(2026, 10, 22, 9))).toBe(2); // still alive tomorrow
    expect(liveStreak(getProgress(), new Date(2026, 10, 23, 9))).toBe(0); // lapsed after a missed day

    recordFound('ITA', new Date(2026, 10, 24, 9)); // after a gap: starts again
    p = getProgress();
    expect(p.streak).toMatchObject({ current: 1, best: 2 });
  });

  it('counts quiz answers and keeps the best round per mode', () => {
    resetProgress();
    recordAnswer('flags', 'KGZ', true, new Date(2026, 10, 21));
    recordAnswer('flags', 'KAZ', false, new Date(2026, 10, 21));
    expect(getProgress().answers).toEqual({ correct: 1, total: 2 });
    const round = (correct: number, total = 20) => ({ correct, total, scope: 'europe', level: 'hard', at: 0 });
    expect(recordRound('flags:guess', round(12))).toBe(true);
    expect(recordRound('flags:guess', round(9))).toBe(false);
    expect(recordRound('flags:guess', round(12))).toBe(false); // a tie isn't a new best
    expect(recordRound('flags:guess', round(13, 14))).toBe(true); // 93% beats 60%
    expect(getProgress().bestRounds['flags:guess']).toMatchObject({ correct: 13, total: 14 });
  });

  it('keeps a list of recent misses that clears when you get them right', () => {
    resetProgress();
    recordMissed('BDI', new Date(2026, 10, 20));
    recordMissed('SWZ', new Date(2026, 10, 21));
    recordAnswer('flags', 'TCD', false, new Date(2026, 10, 21));
    recordAnswer('capitals', 'CHE', false, new Date(2026, 10, 22));
    let p = getProgress();
    expect(recentMisses(p, 'map')).toEqual(['SWZ', 'BDI']); // most recent first
    expect(recentMisses(p, 'flags')).toEqual(['TCD']);
    expect(recentMisses(p, 'capitals')).toEqual(['CHE']);
    recordFound('BDI', new Date(2026, 10, 23));
    recordAnswer('flags', 'TCD', true, new Date(2026, 10, 23));
    p = getProgress();
    expect(recentMisses(p, 'map')).toEqual(['SWZ']);
    expect(recentMisses(p, 'flags')).toEqual([]);
  });

  it('saves the daily dare once per day', () => {
    resetProgress();
    recordDare('2026-11-21', { code: 'KHM', found: true, misses: 0, ms: 4200 });
    recordDare('2026-11-21', { code: 'KHM', found: false, misses: 3, ms: 9000 }); // a replay can't overwrite
    expect(getProgress().dares['2026-11-21']).toEqual({ code: 'KHM', found: true, misses: 0, ms: 4200 });
  });

  it('keeps only the best time per region', () => {
    resetProgress();
    expect(recordTime('europe', 200_000)).toBe(true);
    expect(recordTime('europe', 250_000)).toBe(false);
    expect(recordTime('europe', 180_000)).toBe(true);
    expect(getProgress().bestTimes.europe).toBe(180_000);
  });
});

describe('daily helpers', () => {
  it('numbers editions from launch day', () => {
    expect(editionNumber(new Date(2026, 10, 21, 9))).toBe(1);
    expect(editionNumber(new Date(2026, 10, 22, 23))).toBe(2);
  });

  it('gives the same sequence for the same day', () => {
    const a = seededRandom(seedFor('2026-11-21'));
    const b = seededRandom(seedFor('2026-11-21'));
    const c = seededRandom(seedFor('2026-11-22'));
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect(c()).not.toBe(first[0]);
    expect(first.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('picks one dare country per day, the same for everyone, cycling without repeats', () => {
    expect(new Set(DARE_COUNTRIES).size).toBe(DARE_COUNTRIES.length);
    for (const code of DARE_COUNTRIES) {
      const c = getCountry(code);
      expect(c, code).toBeDefined();
      expect(c!.name.length, c!.name).toBeLessThanOrEqual(15);
    }
    const day = (n: number) => new Date(2026, 10, 21 + n, 12);
    expect(dareCountryCode(day(0))).toBe(dareCountryCode(new Date(2026, 10, 21, 8)));
    const cycle = Array.from({ length: DARE_COUNTRIES.length }, (_, i) => dareCountryCode(day(i)));
    expect(new Set(cycle).size).toBe(DARE_COUNTRIES.length);
    expect(dareCountryCode(day(DARE_COUNTRIES.length))).toBe(cycle[0]);
  });

  it('formats durations', () => {
    expect(formatDuration(187_000)).toBe('3:07');
    expect(formatDuration(54_400)).toBe('0:54');
  });
});
