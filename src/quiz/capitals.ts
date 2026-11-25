// Capital Hop questions. Built on the shared engine, with care for capitals:
//  - every listed capital counts (Bolivia: Sucre or La Paz);
//  - cities with a real governmental role are never offered as wrong answers;
//  - disputed capitals are left out of the capital → country direction;
//  - Hard mode may offer a famous "trap" city (Sydney for Australia), which is
//    never a capital of anywhere in the game.
import { COUNTRIES, type Country } from '../data/countries';
import { pickDistractors, shuffle, type DistractorRules, type Level, type Rand, type Scope } from './engine';

export type CapitalMode = 'to-capital' | 'to-country';

export interface CapitalOption {
  /** country code, or `trap:<city>` for a trap city */
  code: string;
  label: string;
  country: Country | null;
}

export interface CapitalQuestion {
  answer: Country;
  /** the capital this question is about (one of answer.capitals) */
  city: string;
  options: CapitalOption[];
}

/** Big, famous cities people often mistake for the capital. None is a capital. */
export const TRAP_CITIES: Record<string, string[]> = {
  AUS: ['Sydney', 'Melbourne'],
  CAN: ['Toronto', 'Vancouver', 'Montreal'],
  TUR: ['Istanbul'],
  BRA: ['Rio de Janeiro', 'São Paulo'],
  NGA: ['Lagos'],
  NZL: ['Auckland'],
  CHE: ['Zurich', 'Geneva'],
  USA: ['New York City', 'Los Angeles'],
  IND: ['Mumbai', 'Kolkata'],
  MAR: ['Casablanca', 'Marrakesh'],
  VNM: ['Ho Chi Minh City'],
  PAK: ['Karachi', 'Lahore'],
  MMR: ['Yangon'],
  KAZ: ['Almaty'],
  ECU: ['Guayaquil'],
  CMR: ['Douala'],
  ZAF: ['Johannesburg', 'Durban'],
  CHN: ['Shanghai', 'Hong Kong'],
  ARE: ['Dubai'],
  SAU: ['Jeddah', 'Mecca'],
  ITA: ['Milan'],
  DEU: ['Bonn', 'Munich'],
  ESP: ['Barcelona'],
  RUS: ['Saint Petersburg'],
  JPN: ['Osaka', 'Kyoto'],
  KOR: ['Busan'],
  BOL: ['Santa Cruz de la Sierra'],
  GBR: ['Manchester'],
  NLD: ['Rotterdam'],
  BEL: ['Antwerp'],
  POL: ['Kraków'],
  MWI: ['Blantyre'],
  KEN: ['Mombasa'],
  EGY: ['Alexandria'],
  BLZ: ['Belize City'],
  COL: ['Medellín'],
  MEX: ['Guadalajara'],
  PRT: ['Porto'],
  GRC: ['Thessaloniki'],
  IDN: ['Surabaya'],
  PHL: ['Cebu City'],
  THA: ['Chiang Mai'],
  ARG: ['Córdoba'],
  // Not here on purpose: Valparaíso (Chile's Congress), The Hague, Dar es Salaam,
  // Abidjan… they have real governmental roles (see capitals.overrides.mjs).
};

const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Questions so easy they give themselves away ("the capital of Singapore"). */
export function isGiveaway(c: Country): boolean {
  const name = fold(c.name);
  return c.capitals.some((cap) => {
    const city = fold(cap);
    return city.includes(name) || name.includes(city);
  });
}

/** The label shown for a country when it appears as a wrong option. */
const mainCapital = (c: Country) => c.capitals[0];

/** Two countries can't sit together if their capital labels would clash or mislead. */
function capitalsClash(a: Country, b: Country): boolean {
  const la = mainCapital(a);
  const lb = mainCapital(b);
  return (
    fold(la) === fold(lb) ||
    a.capitals.includes(lb) ||
    b.capitals.includes(la) ||
    a.notDistractor.includes(lb) ||
    b.notDistractor.includes(la)
  );
}

export const CAPITAL_RULES: DistractorRules = { clash: capitalsClash };

const pickOne = <T,>(items: readonly T[], rand: Rand): T => items[Math.floor(rand() * items.length)];

export function buildCapitalQuestion(answer: Country, mode: CapitalMode, level: Level, rand: Rand): CapitalQuestion {
  const city = pickOne(answer.capitals, rand);
  const others = pickDistractors(answer, level, rand, CAPITAL_RULES);
  let options: CapitalOption[];
  if (mode === 'to-capital') {
    options = [
      { code: answer.code, label: city, country: answer },
      ...others.map((c) => ({ code: c.code, label: mainCapital(c), country: c })),
    ];
    const traps = TRAP_CITIES[answer.code];
    if (level === 'hard' && traps?.length) {
      const trap = pickOne(traps, rand);
      options[options.length - 1] = { code: `trap:${trap}`, label: trap, country: null };
    }
  } else {
    options = [answer, ...others].map((c) => ({ code: c.code, label: c.name, country: c }));
  }
  return { answer, city, options: shuffle(options, rand) };
}

/** A round over `scope`, each country at most once. */
export function buildCapitalRound(mode: CapitalMode, scope: Scope, count: number, level: Level, rand: Rand): CapitalQuestion[] {
  const pool = (scope === 'world' ? COUNTRIES : COUNTRIES.filter((c) => c.continents.includes(scope))).filter(
    (c) => !(mode === 'to-country' && c.skipReverse) && !(level === 'hard' && isGiveaway(c)),
  );
  return shuffle(pool, rand)
    .slice(0, count)
    .map((answer) => buildCapitalQuestion(answer, mode, level, rand));
}
