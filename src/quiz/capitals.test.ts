import { describe, expect, it } from 'vitest';
import { COUNTRIES, getCountry } from '../data/countries';
import { seededRandom } from '../lib/daily';
import { buildCapitalQuestion, buildCapitalRound, isGiveaway, TRAP_CITIES, type CapitalMode } from './capitals';
import type { Level } from './engine';

const LEVELS: Level[] = ['easy', 'medium', 'hard'];
const MODES: CapitalMode[] = ['to-capital', 'to-country'];
const ALL_CAPITALS = new Set(COUNTRIES.flatMap((c) => c.capitals));
const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

describe('capital questions', () => {
  it('give 4 distinct options with exactly one right answer, for every country, mode and level', () => {
    for (const mode of MODES)
      for (const level of LEVELS) {
        const rand = seededRandom(5);
        for (const answer of COUNTRIES) {
          const q = buildCapitalQuestion(answer, mode, level, rand);
          const where = `${answer.name} ${mode} ${level}`;
          expect(q.options, where).toHaveLength(4);
          expect(new Set(q.options.map((o) => o.code)).size, where).toBe(4);
          expect(new Set(q.options.map((o) => fold(o.label))).size, where).toBe(4);
          expect(q.options.filter((o) => o.code === answer.code), where).toHaveLength(1);
          expect(answer.capitals).toContain(q.city);
        }
      }
  });

  it('never offers another official capital or seat of government of the answer as a wrong option', () => {
    for (const level of LEVELS) {
      const rand = seededRandom(8);
      for (const answer of COUNTRIES) {
        for (let i = 0; i < 3; i++) {
          const q = buildCapitalQuestion(answer, 'to-capital', level, rand);
          for (const o of q.options) {
            if (o.code === answer.code) continue;
            expect(answer.capitals, `${answer.name}: ${o.label}`).not.toContain(o.label);
            expect(answer.notDistractor, `${answer.name}: ${o.label}`).not.toContain(o.label);
          }
        }
      }
    }
  });

  it('accepts either capital for two-capital countries', () => {
    const bolivia = getCountry('BOL')!;
    const seen = new Set<string>();
    const rand = seededRandom(1);
    for (let i = 0; i < 40; i++) seen.add(buildCapitalQuestion(bolivia, 'to-capital', 'medium', rand).city);
    expect([...seen].sort()).toEqual(['La Paz', 'Sucre']);
  });

  it('keeps The Hague away from the Netherlands question', () => {
    const rand = seededRandom(2);
    for (let i = 0; i < 50; i++) {
      const labels = buildCapitalQuestion(getCountry('NLD')!, 'to-capital', 'hard', rand).options.map((o) => o.label);
      expect(labels).not.toContain('The Hague');
    }
  });

  it('only uses trap cities in hard country → capital, and traps are never real capitals', () => {
    for (const [code, cities] of Object.entries(TRAP_CITIES)) {
      const c = getCountry(code);
      expect(c, code).toBeDefined();
      for (const city of cities) {
        expect(ALL_CAPITALS.has(city), city).toBe(false);
        expect(c!.notDistractor, city).not.toContain(city);
      }
    }
    const rand = seededRandom(3);
    const aus = getCountry('AUS')!;
    expect(buildCapitalQuestion(aus, 'to-capital', 'hard', rand).options.some((o) => o.code.startsWith('trap:'))).toBe(true);
    for (const level of ['easy', 'medium'] as Level[]) {
      expect(buildCapitalQuestion(aus, 'to-capital', level, rand).options.some((o) => o.code.startsWith('trap:'))).toBe(false);
    }
    expect(buildCapitalQuestion(aus, 'to-country', 'hard', rand).options.some((o) => o.code.startsWith('trap:'))).toBe(false);
  });

  it('leaves disputed capitals out of capital → country, and giveaways out of hard', () => {
    for (const seed of [1, 2, 3]) {
      const round = buildCapitalRound('to-country', 'world', 197, 'medium', seededRandom(seed));
      expect(round.some((q) => q.answer.skipReverse)).toBe(false);
      expect(round.length).toBe(COUNTRIES.filter((c) => !c.skipReverse).length);
    }
    expect(isGiveaway(getCountry('SGP')!)).toBe(true);
    expect(isGiveaway(getCountry('MEX')!)).toBe(true);
    expect(isGiveaway(getCountry('FRA')!)).toBe(false);
    const hard = buildCapitalRound('to-capital', 'world', 197, 'hard', seededRandom(4));
    expect(hard.some((q) => isGiveaway(q.answer))).toBe(false);
  });
});
