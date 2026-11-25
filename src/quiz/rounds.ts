// How a saved best round reads: "18 / 20" and "Europe · Hard".
import type { RoundRecord } from '../progress/store';
import { LEVELS } from './engine';
import { SCOPES } from './scopes';

export const roundScore = (r: RoundRecord) => `${r.correct} / ${r.total}`;

export const roundWhere = (r: RoundRecord) =>
  [SCOPES.find((s) => s.id === r.scope)?.label, LEVELS.find((l) => l.id === r.level)?.label].filter(Boolean).join(' · ');

/** The better of a few modes' best rounds (e.g. both Flag Spotter modes). */
export function bestOfRounds(rounds: Record<string, RoundRecord>, keys: string[]): RoundRecord | undefined {
  let best: RoundRecord | undefined;
  for (const k of keys) {
    const r = rounds[k];
    if (r && (!best || r.correct * best.total > best.correct * r.total)) best = r;
  }
  return best;
}
