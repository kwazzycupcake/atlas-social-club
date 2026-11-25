import { describe, expect, it } from 'vitest';
import { COUNTRIES, getCountry } from '../data/countries';
import { seededRandom } from '../lib/daily';
import { buildRound, FLAG_RULES, isFinished, newQuiz, pickDistractors, quizReducer, quizSummary, type Level } from './engine';
import { LOOKALIKE_GROUPS, NEAR_IDENTICAL } from './lookalikes';

const LEVELS: Level[] = ['easy', 'medium', 'hard'];

describe('question generation', () => {
  it('always gives 4 distinct options including the answer, for every country and level', () => {
    for (const level of LEVELS) {
      const rand = seededRandom(42);
      for (const answer of COUNTRIES) {
        const d = pickDistractors(answer, level, rand, FLAG_RULES);
        const options = [answer, ...d];
        expect(options, `${answer.name} ${level}`).toHaveLength(4);
        expect(new Set(options.map((o) => o.code)).size).toBe(4);
        expect(new Set(options.map((o) => o.name)).size).toBe(4);
      }
    }
  });

  it('never shows near-identical flags together', () => {
    for (const level of LEVELS) {
      for (const seed of [1, 2, 3, 4, 5]) {
        for (const q of buildRound('world', 197, level, seededRandom(seed), FLAG_RULES)) {
          const codes = q.options.map((o) => o.code);
          for (const [a, b] of NEAR_IDENTICAL) expect(codes.includes(a) && codes.includes(b), codes.join()).toBe(false);
        }
      }
    }
  });

  it('easy uses other continents, medium the same continent', () => {
    const rand = seededRandom(7);
    const kenya = getCountry('KEN')!;
    for (let i = 0; i < 20; i++) {
      expect(pickDistractors(kenya, 'easy', rand).every((c) => !c.continents.includes('africa'))).toBe(true);
      expect(pickDistractors(kenya, 'medium', rand).every((c) => c.continents.includes('africa'))).toBe(true);
    }
  });

  it('hard prefers look-alike flags and neighbours', () => {
    const rand = seededRandom(9);
    const ireland = getCountry('IRL')!;
    for (let i = 0; i < 10; i++) {
      const codes = pickDistractors(ireland, 'hard', rand, FLAG_RULES).map((c) => c.code);
      expect(codes.every((c) => ['CIV', 'ITA', 'MEX', 'GBR'].includes(c))).toBe(true);
    }
  });

  it('look-alike groups only name real countries', () => {
    for (const g of LOOKALIKE_GROUPS) for (const code of g) expect(getCountry(code), code).toBeDefined();
  });

  it('builds rounds from the chosen region without repeats', () => {
    const round = buildRound('south-america', 20, 'medium', seededRandom(3));
    expect(round).toHaveLength(12); // only 12 countries in South America
    expect(new Set(round.map((q) => q.answer.code)).size).toBe(12);
    expect(round.every((q) => q.answer.continents.includes('south-america'))).toBe(true);
    expect(round.every((q) => q.options.some((o) => o.code === q.answer.code))).toBe(true);
  });
});

describe('running a round', () => {
  const qs = buildRound('europe', 3, 'medium', seededRandom(11));
  const right = (i: number) => qs[i].answer.code;
  const wrong = (i: number) => qs[i].options.find((o) => o.code !== qs[i].answer.code)!.code;

  it('builds a streak and resets it on a miss', () => {
    let s = newQuiz(qs);
    s = quizReducer(s, { type: 'pick', code: right(0) });
    expect(s.results).toEqual([true]);
    s = quizReducer(quizReducer(s, { type: 'next' }), { type: 'pick', code: right(1) });
    expect(s.streak).toBe(2);
    s = quizReducer(quizReducer(s, { type: 'next' }), { type: 'pick', code: wrong(2) });
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(2);
    s = quizReducer(s, { type: 'next' });
    expect(isFinished(s)).toBe(true);
    expect(quizSummary(s)).toEqual({ correct: 2, answered: 3, total: 3, accuracy: 67 });
  });

  it('takes one answer per question and ignores options not offered', () => {
    let s = quizReducer(newQuiz(qs), { type: 'pick', code: wrong(0) });
    expect(quizReducer(s, { type: 'pick', code: right(0) })).toBe(s);
    s = quizReducer(s, { type: 'next' });
    expect(quizReducer(s, { type: 'pick', code: 'ZZZ' })).toBe(s);
    expect(quizReducer(newQuiz(qs), { type: 'next' }).index).toBe(0); // can't skip without answering
  });
});
