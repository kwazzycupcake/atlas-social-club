import { describe, expect, it } from 'vitest';
import { choiceStars, mapStars, msUntilNextVoyage, shareText, voyageFor } from './voyage';
import { emptyProgress, voyageStreak } from '../../progress/store';

describe('daily voyage', () => {
  it('is the same all day, for everyone, and different the next day', () => {
    const morning = voyageFor(new Date(2026, 10, 21, 7));
    const night = voyageFor(new Date(2026, 10, 21, 23, 59));
    expect(JSON.stringify(night)).toBe(JSON.stringify(morning));
    const tomorrow = voyageFor(new Date(2026, 10, 22, 9));
    expect(tomorrow.stops.map((s) => s.answer.code)).not.toEqual(morning.stops.map((s) => s.answer.code));
    expect(morning.edition).toBe(1);
    expect(tomorrow.edition).toBe(2);
  });

  it('has five different countries: a map stop, two flags, two capitals, all valid', () => {
    for (let d = 0; d < 60; d++) {
      const v = voyageFor(new Date(2026, 10, 21 + d, 12));
      expect(v.stops.map((s) => s.kind)).toEqual(['map', 'flag', 'capital', 'flag', 'capital']);
      expect(new Set(v.stops.map((s) => s.answer.code)).size).toBe(5);
      for (const s of v.stops) {
        if (s.kind === 'map') {
          expect(s.answer.marker).toBe(false);
          expect(s.answer.areaKm2).toBeGreaterThanOrEqual(25_000);
        } else {
          const opts = s.question.options;
          expect(opts).toHaveLength(4);
          expect(new Set(opts.map((o) => o.code)).size).toBe(4);
          expect(opts.some((o) => o.code === s.answer.code)).toBe(true);
        }
      }
    }
  });

  it('scores stops and shares without spoilers', () => {
    expect([0, 1, 2, 3].map((m) => mapStars(m, m < 3))).toEqual([3, 2, 1, 0]);
    expect(mapStars(0, false)).toBe(0);
    expect(choiceStars(true)).toBe(3);
    const text = shareText(7, [3, 2, 0, 3, 1]);
    expect(text).toBe('Atlas Social Club · Voyage No. 7\n🟩🟨⬜🟩🟧\n9/15 stars');
  });

  it('counts down to midnight and tracks a voyage streak', () => {
    expect(msUntilNextVoyage(new Date(2026, 10, 21, 23, 0))).toBe(3_600_000);
    const p = { ...emptyProgress(), daily: { '2026-11-19': { edition: 1, stars: [], finishedAt: 0 }, '2026-11-20': { edition: 2, stars: [], finishedAt: 0 } } };
    expect(voyageStreak(p, new Date(2026, 10, 21, 9))).toBe(2); // today not played yet: streak still alive
    expect(voyageStreak({ ...p, daily: { ...p.daily, '2026-11-21': { edition: 3, stars: [], finishedAt: 0 } } }, new Date(2026, 10, 21, 9))).toBe(3);
    expect(voyageStreak(p, new Date(2026, 10, 23, 9))).toBe(0); // missed a day
  });
});
