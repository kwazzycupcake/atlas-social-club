// Departures board: every country and its capital(s), searchable and sortable.
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { COUNTRIES, type Country } from '../../data/countries';
import { SCOPES } from '../../quiz/scopes';
import type { Scope } from '../../quiz/engine';
import { BackIcon } from '../../components/ui/Icons';
import s from './capitals.module.css';

const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Sort = 'country' | 'capital';

/** A short tag for special arrangements, shown on the board. */
function badge(c: Country): string | null {
  if (c.skipReverse) return 'disputed'; // before "2 capitals": Palestine's is contested, not shared
  if (c.capitals.length > 1) return `${c.capitals.length} capitals`;
  if (c.code === 'CHE') return 'federal city';
  if (c.code === 'NRU') return 'no official capital';
  if (c.capitalNote) return 'good to know';
  return null;
}

export function DeparturesBoard() {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('world');
  const [sort, setSort] = useState<Sort>('country');
  const [openCode, setOpenCode] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = fold(query.trim());
    const list = COUNTRIES.filter(
      (c) => (scope === 'world' || c.continents.includes(scope)) && (!q || [c.name, ...c.aliases, ...c.capitals].some((n) => fold(n).includes(q))),
    );
    return [...list].sort((a, b) => (sort === 'country' ? a.name.localeCompare(b.name) : a.capitals[0].localeCompare(b.capitals[0])));
  }, [query, scope, sort]);

  return (
    <div className="page">
      <div className={s.head}>
        <Link to="/capital-hop" className={s.back} aria-label="Back to Capital Hop">
          <BackIcon size={18} />
        </Link>
        <div>
          <p className="caption">Capital Hop</p>
          <h1 className={`brand-type ${s.title}`}>Departures board</h1>
          <p className={s.sub}>
            Every country and its capital. Tap a row with a tag to read about its arrangement.
          </p>
        </div>
      </div>

      <div className={s.tools}>
        <label className={s.search}>
          <span className="visually-hidden">Search by country or capital</span>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5L20 20" />
          </svg>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Country or capital" />
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

      <div className={s.board}>
        <div className={s.boardTop}>
          <h2 className={`brand-type ${s.boardTitle}`}>Departures</h2>
          <span className={s.boardCount} aria-live="polite">
            {rows.length} {rows.length === 1 ? 'destination' : 'destinations'}
          </span>
        </div>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col" className={s.flagCol}>
                <span className="visually-hidden">Flag</span>
              </th>
              <th scope="col" aria-sort={sort === 'country' ? 'ascending' : 'none'}>
                <button type="button" onClick={() => setSort('country')} className={s.sortBtn} data-active={sort === 'country'}>
                  Country
                </button>
              </th>
              <th scope="col" aria-sort={sort === 'capital' ? 'ascending' : 'none'}>
                <button type="button" onClick={() => setSort('capital')} className={s.sortBtn} data-active={sort === 'capital'}>
                  Capital
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const tag = badge(c);
              const open = openCode === c.code;
              return (
                <tr key={c.code}>
                  <td className={s.flagCol}>
                    <img src={c.flag} alt="" width={40} height={30} loading="lazy" />
                  </td>
                  <td>
                    <span className={s.country}>{c.name}</span>
                    {tag &&
                      (c.capitalNote ? (
                        <button type="button" className={s.badge} aria-expanded={open} onClick={() => setOpenCode(open ? null : c.code)}>
                          {tag}
                        </button>
                      ) : (
                        <span className={s.badge}>{tag}</span>
                      ))}
                    {open && c.capitalNote && <p className={s.rowNote}>{c.capitalNote}</p>}
                  </td>
                  <td className={s.capital}>
                    {c.capitals.join(' · ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className={s.empty}>
            <span className="hand">no departures…</span> Try another search.
          </p>
        )}
      </div>
    </div>
  );
}
