import { REGIONS } from '../data/countries';
import { loadPref, savePref } from '../lib/prefs';
import type { Level, Scope } from './engine';

/** Where a quiz round draws its countries from. */
export const SCOPES: { id: Scope; label: string; color: string }[] = [
  { id: 'world', label: 'World', color: 'var(--paper-deep)' },
  ...REGIONS.map((r) => ({ id: r.id as Scope, label: r.short, color: r.color })),
];
export const isScope = (v: unknown): v is Scope => SCOPES.some((x) => x.id === v);
export const isLevel = (v: unknown): v is Level => v === 'easy' || v === 'medium' || v === 'hard';

export const ROUND_LENGTH = 20;

/** Remember the last region + difficulty per game (e.g. "flags", "capitals"). */
export const loadQuizPrefs = (game: string) => ({
  scope: loadPref<Scope>(`${game}.scope`, 'world', isScope),
  level: loadPref<Level>(`${game}.level`, 'medium', isLevel),
});
export const saveQuizPrefs = (game: string, scope: Scope, level: Level) => {
  savePref(`${game}.scope`, scope);
  savePref(`${game}.level`, level);
};
