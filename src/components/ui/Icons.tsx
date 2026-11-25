// Hand-drawn style icons: plum ink outline + pastel fill. Decorative by default;
// pass `title` to make an icon meaningful to screen readers.
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number; title?: string };

function Svg({ size = 20, title, children, viewBox = '0 0 24 24', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {children}
    </svg>
  );
}

const ink = { stroke: 'var(--ink)', strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export const FlameIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2c1.4 4.5 6 6.4 6 12a6 6 0 0 1-12 0c0-2.6 1.3-4.6 2.6-5.8.3 2 1.5 3.2 2.6 3.2 0-3.8-.2-6.6.8-9.4z" fill="var(--coral)" strokeWidth={1.6} {...ink} />
  </Svg>
);

export const StarIcon = ({ filled = true, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p}>
    <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill={filled ? 'var(--sunshine)' : 'none'} strokeWidth={1.6} {...ink} />
  </Svg>
);

export const HeartIcon = ({ filled = true, ...p }: IconProps & { filled?: boolean }) => (
  <Svg viewBox="0 0 24 22" {...p}>
    <path d="M12 20S2 14 2 7.5A5 5 0 0 1 12 5a5 5 0 0 1 10 2.5C22 14 12 20 12 20z" fill={filled ? 'var(--blush)' : 'none'} strokeWidth={1.8} strokeDasharray={filled ? undefined : '3 2'} {...ink} />
  </Svg>
);

export const BackIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" fill="none" strokeWidth={2.6} {...ink} />
  </Svg>
);

export const ArrowIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" fill="none" strokeWidth={2.4} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" strokeWidth={3} {...ink} />
  </Svg>
);

export const MapIcon = (p: IconProps) => (
  <Svg viewBox="0 0 52 52" {...p}>
    <path d="M8 12l12-4 12 4 12-4v32l-12 4-12-4-12 4z" fill="var(--butter)" strokeWidth={2.2} {...ink} />
    <path d="M20 8v32M32 12v32" strokeWidth={2} strokeDasharray="3 3" {...ink} />
    <path d="M26 30c-4-5-6-8-6-11a6 6 0 0 1 12 0c0 3-2 6-6 11z" fill="var(--coral)" strokeWidth={2} {...ink} />
  </Svg>
);

export const FlagIcon = (p: IconProps) => (
  <Svg viewBox="0 0 52 52" {...p}>
    <path d="M12 6v42" strokeWidth={2.6} {...ink} />
    <path d="M13 9c8-4 14 4 22 0s8 0 8 0v20s-4-4-10 0-14-4-20 0z" fill="var(--periwinkle)" strokeWidth={2.2} {...ink} />
    <circle cx="28" cy="19" r="4.5" fill="var(--sunshine)" strokeWidth={1.8} {...ink} />
  </Svg>
);

export const CityIcon = (p: IconProps) => (
  <Svg viewBox="0 0 52 52" {...p}>
    <path d="M8 44h36" strokeWidth={2.4} {...ink} />
    <path d="M12 44V24h10v20M22 44V14l8-6 8 6v30" fill="var(--apricot)" strokeWidth={2.2} {...ink} />
    <path d="M12 24l5-5 5 5" fill="var(--blush)" strokeWidth={2} {...ink} />
    <path d="M27 20h6M27 27h6M27 34h6" strokeWidth={2} {...ink} />
  </Svg>
);

export const PlaneIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 3L9 8l4 3z" fill="var(--card)" strokeWidth={1.8} {...ink} />
    <path d="M21 3L13 11l2 6z" fill="var(--periwinkle)" strokeWidth={1.8} {...ink} />
    <path d="M3 20c3-3 5-4 8-6" fill="none" stroke="var(--wave)" strokeWidth={2} strokeDasharray="2 3" strokeLinecap="round" />
  </Svg>
);

export const PassportIcon = (p: IconProps) => (
  <Svg viewBox="0 0 52 52" {...p}>
    <rect x="11" y="6" width="30" height="40" rx="4" fill="var(--lilac)" strokeWidth={2.2} {...ink} />
    <circle cx="26" cy="22" r="7" fill="var(--card)" strokeWidth={2} {...ink} />
    <path d="M19 22h14M26 15c-3 4-3 10 0 14M26 15c3 4 3 10 0 14" fill="none" strokeWidth={1.4} {...ink} />
    <path d="M18 36h16" strokeWidth={2} {...ink} />
  </Svg>
);
