import palette from './palette.json';
import { getCountry } from '../data/countries';

/** Twelve soft, calm pastels for coloured-in countries (light enough to read the labels on). */
export const PALETTE: string[] = palette;

/** A country's atlas colour: neighbours always differ (assigned in scripts/build-data.mjs). */
export function countryColor(code: string): string {
  const c = getCountry(code);
  return PALETTE[c ? c.color % PALETTE.length : 0];
}
