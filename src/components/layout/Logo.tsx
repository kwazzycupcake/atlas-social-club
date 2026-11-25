// Brand mark: a folded paper plane on a dotted route (shown beside the name).
// The browser-tab icon is a separate mark, the globe pin (public/favicon.svg).
export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M4 54c8-18 26 2 24-14-1-9 8-14 14-13"
        fill="none"
        stroke="var(--wave)"
        strokeWidth="2.6"
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
      <path d="M61 9L26 22l12 6z" fill="var(--card)" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M61 9L38 28l4 13z" fill="var(--periwinkle)" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M38 28l-1 8 5 5" fill="var(--blush)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
