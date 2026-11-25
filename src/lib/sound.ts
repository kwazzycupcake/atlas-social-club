// Little game sounds, synthesised with the Web Audio API (no audio files).
// Muting is remembered on this device.
import { useSyncExternalStore } from 'react';

const KEY = 'atlas-social-club:muted';
let muted = false;
try {
  muted = localStorage.getItem(KEY) === '1';
} catch {
  /* storage blocked: default to sound on */
}
const listeners = new Set<() => void>();

export function isMuted() {
  return muted;
}
export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}
export function useMuted(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    isMuted,
    () => false,
  );
}

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume(); // browsers start audio only after a tap
  return ctx;
}

/** One soft note with a quick attack and a gentle fade. */
function note(ac: AudioContext, freq: number, start: number, length: number, type: OscillatorType = 'sine', volume = 0.18, slideTo?: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + length);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

export const sounds = {
  /** bright two-note chime; a third note for a first-try find */
  correct(firstTry = true) {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    note(ac, 784, t, 0.18, 'triangle', 0.16); // G5
    note(ac, 1175, t + 0.09, 0.32, 'triangle', 0.16); // D6
    if (firstTry) note(ac, 1568, t + 0.18, 0.35, 'sine', 0.09); // G6 sparkle
  },
  /** soft low bonk */
  wrong() {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    note(ac, 220, t, 0.22, 'triangle', 0.2, 140);
  },
  /** gentle descending pair when a country is revealed */
  reveal() {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    note(ac, 523, t, 0.2, 'sine', 0.12);
    note(ac, 392, t + 0.14, 0.3, 'sine', 0.12);
  },
  /** little fanfare for finishing a map */
  finish() {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => note(ac, f, t + i * 0.11, 0.3, 'triangle', 0.14));
    note(ac, 1319, t + 0.48, 0.6, 'sine', 0.1);
  },
};
