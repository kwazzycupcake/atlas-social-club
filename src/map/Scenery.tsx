// Storybook scenery round the game map: sky decorations above it and hills
// round its bottom corners. Shared by Map Hunt and today's dare.
import s from './scenery.module.css';

/** Sky over the map: a paper-plane trail, a balloon, a compass and clouds (wide screens only). */
export function SkyDecor() {
  return (
    <svg className={s.sky} viewBox="0 0 1440 170" preserveAspectRatio="xMidYMin meet" aria-hidden="true">
      <path className={s.trail} d="M150 120C120 80 160 40 230 50S360 90 430 60 520 90 560 128" />
      <g className={s.skyCloud}>
        <path d="M560 112c-18 0-20-22-2-24 2-18 28-22 38-8 10-12 34-8 34 10 18 0 20 22 2 22z" />
        <path d="M800 140c-12 0-14-15-1-16 1-12 19-15 25-5 7-8 23-5 23 7 12 0 13 14 1 14z" />
        <path d="M1010 92c-14 0-16-17-1-18 1-14 22-17 30-6 8-9 26-6 26 8 14 0 16 16 1 16z" />
      </g>
      <g className={s.balloon} transform="translate(690 14)">
        <path d="M26 0C46 0 52 18 49 30 46 44 35 52 31 58H21C17 52 6 44 3 30 0 18 6 0 26 0Z" fill="#f4b48a" />
        <path d="M26 0C19 14 19 42 23 58M26 0C33 14 33 42 29 58" fill="none" stroke="#fffaf0" strokeWidth="2.5" />
        <path d="M22 58L21 68M30 58L31 68" fill="none" />
        <rect x="18" y="68" width="16" height="11" rx="2" fill="#d9b48a" />
      </g>
      <g className={s.compass} transform="translate(930 74)">
        <circle r="30" fill="none" />
        <path d="M0-42L7 0 0 42-7 0Z" fill="#fffaf0" />
        <path d="M-42 0L0-7 42 0 0 7Z" fill="#fffaf0" />
        <path d="M0-42L7 0H-7Z" fill="var(--coral)" />
      </g>
    </svg>
  );
}

/** Green hills, a lighthouse and trees curling round the map's bottom corners. */
export function Hills({ className }: { className?: string }) {
  return (
    <div className={className ? `${s.hills} ${className}` : s.hills} aria-hidden="true">
      <svg className={s.hillLayers} viewBox="0 0 1440 150" preserveAspectRatio="none">
        <path d="M0 20C70 6 150 24 230 66S350 150 430 150H1010C1090 150 1160 100 1230 64S1380 12 1440 28V150H0Z" fill="#d6e5bd" />
        <path d="M0 74C100 56 200 92 290 124S420 150 520 150H920C1020 150 1120 132 1200 104S1380 70 1440 80V150H0Z" fill="#bcd6a2" />
      </svg>
      <svg className={s.lighthouse} viewBox="0 0 40 72">
        <path d="M8 70L13 18H27L32 70Z" fill="#fffaf0" />
        <path d="M10 52H30M11.5 36H28.5" stroke="var(--coral)" strokeWidth="6" />
        <rect x="12" y="8" width="16" height="10" fill="#f6d488" />
        <path d="M10 8L20 0 30 8Z" fill="var(--coral)" />
        <path d="M8 70L13 18H27L32 70ZM12 8H28V18H12ZM10 8L20 0 30 8Z" fill="none" stroke="#8a7d8f" strokeWidth="1.6" />
      </svg>
      <svg className={s.trees} viewBox="0 0 110 60">
        <ellipse cx="20" cy="36" rx="17" ry="22" fill="#9cbf8c" />
        <ellipse cx="56" cy="30" rx="21" ry="29" fill="#8fb57f" />
        <ellipse cx="92" cy="40" rx="15" ry="19" fill="#9cbf8c" />
      </svg>
    </div>
  );
}
