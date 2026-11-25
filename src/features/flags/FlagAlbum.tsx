// Stamp album: every flag in the world, searchable, with a closer look at each.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { COUNTRIES, REGIONS, type Country } from '../../data/countries';
import { Button } from '../../components/ui';
import { BackIcon } from '../../components/ui/Icons';
import { Flag, SCOPES } from './common';
import type { Scope } from '../../quiz/engine';
import s from './flags.module.css';

/** Case- and accent-insensitive text for search. */
const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function FlagAlbum() {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('world');
  const [open, setOpen] = useState<Country | null>(null);

  const shown = useMemo(() => {
    const q = fold(query.trim());
    return COUNTRIES.filter(
      (c) =>
        (scope === 'world' || c.continents.includes(scope)) &&
        (!q || [c.name, ...c.aliases, ...c.capitals].some((n) => fold(n).includes(q))),
    );
  }, [query, scope]);

  return (
    <div className="page">
      <div className={s.head}>
        <Link to="/flag-spotter" className={s.back} aria-label="Back to Flag Spotter">
          <BackIcon size={18} />
        </Link>
        <div>
          <p className="caption">Flag Spotter</p>
          <h1 className={`brand-type ${s.title}`}>Stamp album</h1>
          <p className={s.sub}>
            Every flag in the world. Search for one, or tap a stamp for a closer look.
          </p>
        </div>
      </div>

      <div className={s.albumTools}>
        <label className={s.search}>
          <span className="visually-hidden">Search flags by country or capital</span>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5L20 20" />
          </svg>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a country or capital" />
        </label>
        <div className={s.chips} role="group" aria-label="Region">
          {SCOPES.map((sc) => (
            <button
              key={sc.id}
              type="button"
              aria-pressed={scope === sc.id}
              style={{ background: scope === sc.id ? sc.color : undefined }}
              onClick={() => setScope(sc.id)}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      <p className={s.count} aria-live="polite">
        {shown.length === COUNTRIES.length ? `All ${shown.length} flags` : `${shown.length} ${shown.length === 1 ? 'flag' : 'flags'}`}
      </p>

      {shown.length === 0 ? (
        <p className={s.empty}>
          <span className="hand">no stamps here…</span> Try another search.
        </p>
      ) : (
        <ul className={s.album}>
          {shown.map((c, i) => {
            return (
              <li key={c.code}>
                <button type="button" className={s.albumItem} onClick={() => setOpen(c)} style={{ ['--tilt' as string]: `${((i * 37) % 5) - 2}deg` }}>
                  <span className={s.albumStamp}>
                    <Flag country={c} alt={`Flag of ${c.name}`} />
                  </span>
                  <span className={s.albumName}>{c.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && <FlagDetails country={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** A closer look at one country: its flag, capital(s) and region (also used by the passport). */
export function FlagDetails({ country: c, onClose }: { country: Country; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  // No clean-up close(): removing the element closes it, and calling close()
  // would fire onClose and dismiss the dialog during React's dev double-run.
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const regions = c.continents.map((r) => REGIONS.find((x) => x.id === r)!.label).join(' & ');
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby="flag-detail-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
    >
      <div className={s.dialogBody}>
        <span className={s.bigStamp}>
          <Flag country={c} alt={`Flag of ${c.name}`} eager />
        </span>
        <h2 id="flag-detail-title" className={`brand-type ${s.dialogTitle}`}>
          {c.name}
        </h2>
        {c.officialName !== c.name && <p className={s.official}>{c.officialName}</p>}
        <dl className={s.facts}>
          <div>
            <dt>{c.capitals.length > 1 ? 'Capitals' : 'Capital'}</dt>
            <dd>{c.capitals.join(' · ')}</dd>
          </div>
          <div>
            <dt>Region</dt>
            <dd>{c.subregion && c.subregion !== regions ? `${regions} · ${c.subregion}` : regions}</dd>
          </div>
        </dl>
        {c.capitalNote && <p className={s.note}>{c.capitalNote}</p>}
        <Button variant="secondary" onClick={() => ref.current?.close()}>
          Close
        </Button>
      </div>
    </dialog>
  );
}
