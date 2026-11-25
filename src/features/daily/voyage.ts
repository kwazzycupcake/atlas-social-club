// Today's voyage: five stops, the same for everyone on a given day.
// Everything is derived from the date with a seeded random generator, so no
// server is needed and every player sees identical questions and options.
import { COUNTRIES, type Country } from '../../data/countries';
import { DAILY_STOPS, dayKey, editionNumber, seedFor, seededRandom, type StopKind } from '../../lib/daily';
import { FLAG_RULES, pickDistractors, shuffle, type Question } from '../../quiz/engine';
import { buildCapitalQuestion, type CapitalQuestion } from '../../quiz/capitals';

export type Stop =
  | { kind: 'map'; answer: Country }
  | { kind: 'flag'; answer: Country; question: Question }
  | { kind: 'capital'; answer: Country; question: CapitalQuestion };

export interface Voyage {
  day: string;
  edition: number;
  stops: Stop[];
}

export const MAX_STARS_PER_STOP = 3;

/** Map stops use countries big enough to find on a world map without hunting. */
const findableOnWorldMap = (c: Country) => !c.marker && c.areaKm2 >= 25_000;

export function voyageFor(date = new Date()): Voyage {
  const day = dayKey(date);
  const rand = seededRandom(seedFor(`voyage:${day}`));
  const used = new Set<string>();
  const take = (ok: (c: Country) => boolean) => {
    const c = shuffle(COUNTRIES, rand).find((x) => !used.has(x.code) && ok(x))!;
    used.add(c.code);
    return c;
  };

  const stops = DAILY_STOPS.map((kind: StopKind): Stop => {
    if (kind === 'map') return { kind, answer: take(findableOnWorldMap) };
    if (kind === 'flag') {
      const answer = take(() => true);
      return { kind, answer, question: { answer, options: shuffle([answer, ...pickDistractors(answer, 'medium', rand, FLAG_RULES)], rand) } };
    }
    const answer = take((c) => !c.skipReverse);
    return { kind, answer, question: buildCapitalQuestion(answer, 'to-capital', 'medium', rand) };
  });

  return { day, edition: editionNumber(date), stops };
}

/** Stars for a map stop: 3 first try, 2 second, 1 third, 0 if it had to be shown. */
export const mapStars = (misses: number, found: boolean) => (found ? Math.max(0, MAX_STARS_PER_STOP - misses) : 0);
/** Stars for a multiple-choice stop: all or nothing. */
export const choiceStars = (right: boolean) => (right ? MAX_STARS_PER_STOP : 0);

const SQUARE = ['⬜', '🟧', '🟨', '🟩'];

/** Spoiler-free text to share, like "🟩🟨🟩⬜🟩". */
export function shareText(edition: number, stars: number[]): string {
  const total = stars.reduce((a, b) => a + b, 0);
  return `Atlas Social Club · Voyage No. ${edition}\n${stars.map((s) => SQUARE[s]).join('')}\n${total}/${stars.length * MAX_STARS_PER_STOP} stars`;
}

/** ms until the next local midnight, when a new voyage opens. */
export function msUntilNextVoyage(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}
