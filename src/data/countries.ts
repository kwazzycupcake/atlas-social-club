// Typed access to the generated country dataset (see scripts/build-data.mjs).
import raw from './countries.json';
import { asset } from '../lib/asset';

export type RegionId = 'africa' | 'asia' | 'europe' | 'north-america' | 'south-america' | 'oceania';

export interface Country {
  /** ISO 3166-1 alpha-3 (Kosovo uses the dataset's "UNK") */
  code: string;
  iso2: string;
  isoNumeric: string | null;
  name: string;
  officialName: string;
  aliases: string[];
  continents: RegionId[];
  subregion: string;
  /** every entry counts as a correct answer */
  capitals: string[];
  capitalNote: string | null;
  /** cities with a governmental role that must never be offered as a wrong option */
  notDistractor: string[];
  /** skip "which country has this capital?" (disputed capital) */
  skipReverse: boolean;
  latlng: [number, number];
  areaKm2: number;
  /** map feature ids: ISO numeric, or `name:<Natural Earth name>` */
  featureIds: string[];
  /** small enough to need a tappable marker on the map */
  marker: boolean;
  flag: string;
  unMember: boolean;
  /** index into src/map/palette.json; bordering countries never share one */
  color: number;
  /** codes of countries sharing a land border (from the map shapes) */
  neighbors: string[];
}

// flag paths point into public/, so they follow the site's base path
export const COUNTRIES = (raw as Country[]).map((c) => ({ ...c, flag: asset(c.flag) }));

export interface Region {
  id: RegionId;
  label: string;
  short: string;
  /** CSS colour token for this continent */
  color: string;
}

export const REGIONS: Region[] = [
  { id: 'africa', label: 'Africa', short: 'Africa', color: 'var(--butter)' },
  { id: 'asia', label: 'Asia', short: 'Asia', color: 'var(--blush)' },
  { id: 'europe', label: 'Europe', short: 'Europe', color: 'var(--periwinkle)' },
  { id: 'north-america', label: 'North America', short: 'N. America', color: 'var(--mint)' },
  { id: 'south-america', label: 'South America', short: 'S. America', color: 'var(--apricot)' },
  { id: 'oceania', label: 'Oceania', short: 'Oceania', color: 'var(--lilac)' },
];

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code: string): Country | undefined {
  return byCode.get(code);
}

export function countriesIn(region: RegionId | 'world'): Country[] {
  return region === 'world' ? COUNTRIES : COUNTRIES.filter((c) => c.continents.includes(region));
}

export const TOTAL_COUNTRIES = COUNTRIES.length;
