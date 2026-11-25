import { setMuted, useMuted } from '../../lib/sound';
import s from './ui.module.css';

export function SoundToggle() {
  const muted = useMuted();
  return (
    <button
      type="button"
      className={s.iconBtn}
      aria-pressed={!muted}
      aria-label={muted ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off'}
      onClick={() => setMuted(!muted)}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="var(--butter)" stroke="var(--ink)" strokeWidth="1.8" strokeLinejoin="round" />
        {muted ? (
          <path d="M16 9.5l5 5M21 9.5l-5 5" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
        ) : (
          <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
