// Multiple-choice quiz engine shared by Flag Spotter and Capital Hop.
//
// Questions are generated from the country dataset: one right answer plus three
// distractors chosen by difficulty. A pure reducer runs the round.
import { COUNTRIES, type Country, type RegionId } from '../data/countries';
import { lookalikesOf, tooSimilar } from './lookalikes';

export type Level = 'easy' | 'medium' | 'hard';
export type Scope = RegionId | 'world';

export const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: 'easy', label: 'Easy', hint: 'Wrong options come from other continents.' },
  { id: 'medium', label: 'Medium', hint: 'Wrong options come from the same continent.' },
  { id: 'hard', label: 'Hard', hint: 'Neighbours and look-alikes. Good luck.' },
];

export interface Question {
  answer: Country;
  /** four countries, answer included, in display order */
  options: Country[];
}

export type Rand = () => number;

export function shuffle<T>(items: readonly T[], rand: Rand): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const sameContinent = (a: Country, b: Country) => a.continents.some((r) => b.continents.includes(r));

export interface DistractorRules {
  /** two countries must not appear together (e.g. near-identical flags) */
  clash?: (a: Country, b: Country) => boolean;
  /** extra "hard" candidates for this answer, best first */
  tricky?: (answer: Country) => string[];
}

/** Three wrong options for `answer`, picked by difficulty, never duplicates. */
export function pickDistractors(answer: Country, level: Level, rand: Rand, rules: DistractorRules = {}): Country[] {
  const chosen: Country[] = [];
  const ok = (c: Country) =>
    c.code !== answer.code &&
    !chosen.some((x) => x.code === c.code || x.name === c.name) &&
    ![answer, ...chosen].some((x) => rules.clash?.(x, c));

  const take = (candidates: Country[]) => {
    for (const c of candidates) {
      if (chosen.length >= 3) return;
      if (ok(c)) chosen.push(c);
    }
  };

  const others = shuffle(COUNTRIES, rand);
  if (level === 'hard') {
    const tricky = (rules.tricky?.(answer) ?? []).map((code) => COUNTRIES.find((c) => c.code === code)).filter(Boolean) as Country[];
    take(shuffle(tricky, rand));
    take(answer.neighbors.map((code) => COUNTRIES.find((c) => c.code === code)!).filter(Boolean));
    take(others.filter((c) => c.subregion === answer.subregion));
    take(others.filter((c) => sameContinent(c, answer)));
  } else if (level === 'medium') {
    take(others.filter((c) => sameContinent(c, answer)));
  } else {
    take(others.filter((c) => !sameContinent(c, answer)));
  }
  take(others); // top up from anywhere if a region is too small
  return chosen;
}

/** A round of questions over `scope`, each country at most once. */
export function buildRound(scope: Scope, count: number, level: Level, rand: Rand, rules: DistractorRules = {}): Question[] {
  const pool = scope === 'world' ? COUNTRIES : COUNTRIES.filter((c) => c.continents.includes(scope));
  return shuffle(pool, rand)
    .slice(0, count)
    .map((answer) => ({ answer, options: shuffle([answer, ...pickDistractors(answer, level, rand, rules)], rand) }));
}

/** Flag-specific rules: no near-identical pairs; look-alike flags are the hard ones. */
export const FLAG_RULES: DistractorRules = {
  clash: (a, b) => tooSimilar(a.code, b.code),
  tricky: (answer) => lookalikesOf(answer.code),
};

/* ---------- running a round ---------- */

/** Anything with a right answer and options identified by code. */
export interface QuestionLike {
  answer: { code: string };
  options: { code: string }[];
}

export interface QuizState<Q extends QuestionLike = Question> {
  questions: Q[];
  index: number;
  /** code the player picked for the current question */
  picked: string | null;
  results: boolean[];
  streak: number;
  bestStreak: number;
}

export type QuizAction<Q extends QuestionLike = Question> = { type: 'pick'; code: string } | { type: 'next' } | { type: 'reset'; questions: Q[] };

export const newQuiz = <Q extends QuestionLike>(questions: Q[]): QuizState<Q> => ({
  questions,
  index: 0,
  picked: null,
  results: [],
  streak: 0,
  bestStreak: 0,
});

export const isFinished = <Q extends QuestionLike>(s: QuizState<Q>) => s.index >= s.questions.length;
export const current = <Q extends QuestionLike>(s: QuizState<Q>): Q | null => s.questions[s.index] ?? null;

export function quizReducer<Q extends QuestionLike>(s: QuizState<Q>, a: QuizAction<Q>): QuizState<Q> {
  switch (a.type) {
    case 'reset':
      return newQuiz(a.questions);
    case 'pick': {
      const q = current(s);
      if (!q || s.picked !== null) return s; // one answer per question
      if (!q.options.some((o) => o.code === a.code)) return s;
      const right = a.code === q.answer.code;
      const streak = right ? s.streak + 1 : 0;
      return {
        ...s,
        picked: a.code,
        results: [...s.results, right],
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
      };
    }
    case 'next':
      if (s.picked === null) return s;
      return { ...s, index: s.index + 1, picked: null };
  }
}

export function quizSummary<Q extends QuestionLike>(s: QuizState<Q>) {
  const correct = s.results.filter(Boolean).length;
  return { correct, answered: s.results.length, total: s.questions.length, accuracy: s.results.length ? Math.round((correct / s.results.length) * 100) : 0 };
}
