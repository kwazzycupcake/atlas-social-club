// A short burst of pastel paper confetti. Pure CSS, no library.
// Renders nothing for people who prefer reduced motion.
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import s from './confetti.module.css';

const COLORS = ['#F4A6A0', '#F9DC8C', '#9FD8C4', '#A9CFEA', '#B8B5EC', '#F2A97E', '#C8E3A0', '#E2B3E6'];

export function Confetti({ pieces = 70, duration = 2600 }: { pieces?: number; duration?: number }) {
  const [on, setOn] = useState(true);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const t = setTimeout(() => setOn(false), duration + 400);
    return () => clearTimeout(t);
  }, [duration]);

  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 350,
        fall: duration * (0.7 + Math.random() * 0.3),
        drift: (Math.random() - 0.5) * 220,
        spin: (Math.random() - 0.5) * 1080,
        w: 6 + Math.random() * 7,
        h: 8 + Math.random() * 10,
        color: COLORS[i % COLORS.length],
        round: Math.random() < 0.25,
      })),
    [pieces, duration],
  );

  if (!on || reduced) return null;
  return (
    <div className={s.layer} aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          className={s.bit}
          style={
            {
              left: `${b.left}%`,
              width: b.w,
              height: b.round ? b.w : b.h,
              borderRadius: b.round ? '999px' : '2px',
              background: b.color,
              animationDelay: `${b.delay}ms`,
              animationDuration: `${b.fall}ms`,
              '--drift': `${b.drift}px`,
              '--spin': `${b.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
