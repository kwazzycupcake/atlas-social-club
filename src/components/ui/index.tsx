import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import s from './ui.module.css';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/* ---------- Button / ButtonLink ---------- */
type Variant = 'primary' | 'secondary';
type Size = 'small' | 'medium' | 'large';
const buttonClass = (variant: Variant, size: Size, className?: string) =>
  cx(s.button, s[variant], size !== 'medium' && s[size], className);

export function Button({
  variant = 'primary',
  size = 'medium',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({
  to,
  variant = 'primary',
  size = 'medium',
  className,
  children,
}: {
  to: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/* ---------- Frame: vintage double-rule picture frame ---------- */
export function Frame({
  children,
  className,
  gap,
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  /** colour of the gap between the two rules (defaults to paper) */
  gap?: string;
  as?: 'div' | 'section' | 'aside';
  'aria-label'?: string;
}) {
  return (
    <Tag className={cx(s.frame, className)} style={gap ? ({ '--frame-gap': gap } as CSSProperties) : undefined} {...rest}>
      {children}
    </Tag>
  );
}

/* ---------- Chip ---------- */
export function Chip({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <span className={cx(s.chip, className)} aria-label={label} role={label ? 'img' : undefined}>
      {children}
    </span>
  );
}

/* ---------- Ticket: notched answer option ---------- */
export type TicketState = 'idle' | 'correct' | 'wrong' | 'muted';
export function Ticket({
  state = 'idle',
  children,
  trailing,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { state?: TicketState; trailing?: ReactNode }) {
  return (
    <div className={s.ticketWrap}>
      <button type="button" className={s.ticket} data-state={state} {...rest}>
        <span>{children}</span>
        {trailing}
      </button>
    </div>
  );
}

/* ---------- Stamp: round postmark ---------- */
export function Stamp({
  top,
  big,
  bottom,
  size = 96,
  color,
  tilt = -10,
  gapColor,
  className,
}: {
  top?: string;
  big: string;
  bottom?: string;
  size?: number;
  color?: string;
  tilt?: number;
  gapColor?: string;
  className?: string;
}) {
  const style = {
    width: size,
    height: size,
    '--tilt': `${tilt}deg`,
    ...(color ? { '--stamp': color } : {}),
    ...(gapColor ? { '--stamp-gap': gapColor } : {}),
  } as CSSProperties;
  return (
    <span className={cx(s.stamp, className)} style={style}>
      {top && <span>{top}</span>}
      <span className={s.stampBig}>{big}</span>
      {bottom && <span>{bottom}</span>}
    </span>
  );
}
