import type { Country } from '../../data/countries';
import type { Level, Scope } from '../../quiz/engine';
import { loadQuizPrefs, saveQuizPrefs } from '../../quiz/scopes';
import s from './flags.module.css';

export { SCOPES, isScope, isLevel, ROUND_LENGTH } from '../../quiz/scopes';

export type FlagMode = 'guess' | 'find';

export const loadFlagPrefs = () => loadQuizPrefs('flags');
export const saveFlagPrefs = (scope: Scope, level: Level) => saveQuizPrefs('flags', scope, level);

export const MODE_TITLE: Record<FlagMode, string> = { guess: 'Whose flag?', find: 'Pick the flag' };

/**
 * A flag image. `alt` is required: in quizzes it must not give the answer away.
 */
export function Flag({ country, alt, className, eager }: { country: Country; alt: string; className?: string; eager?: boolean }) {
  return (
    <img
      src={country.flag}
      alt={alt}
      width={240}
      height={180}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={`${s.flag} ${className ?? ''}`}
    />
  );
}
