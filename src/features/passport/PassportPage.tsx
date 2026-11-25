// My Passport: everything you've done, all from this device.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { COUNTRIES, getCountry, REGIONS, TOTAL_COUNTRIES, type Country } from '../../data/countries';
import { loadShapes, type MapShape } from '../../map/geo';
import { makeView } from '../../map/views';
import { WorldMap, type Look } from '../../map/WorldMap';
import { countryColor } from '../../map/palette';
import { accuracy, foundByRegion, liveStreak, rankOf, recentMisses, resetProgress, useProgress, voyageStreak, type MissKind, type Progress } from '../../progress/store';
import { roundScore, roundWhere } from '../../quiz/rounds';
import { Flag } from '../flags/common';
import { FlagDetails } from '../flags/FlagAlbum';
import { formatDuration } from '../../lib/format';
import { MAP_CHOICES } from '../map-hunt/regions';
import { Button, Frame, Stamp } from '../../components/ui';
import { BackIcon, CheckIcon } from '../../components/ui/Icons';
import s from './passport.module.css';

export function PassportPage() {
  const p = useProgress();
  const { rank, found, into, span, next } = rankOf(p);
  const voyages = Object.keys(p.daily).length;
  const acc = accuracy(p);
  const regions = foundByRegion(p);
  const empty = found === 0 && p.answers.total === 0 && Object.keys(p.daily).length === 0;

  return (
    <div className="page">
      <div className={s.head}>
        <Link to="/" className={s.back} aria-label="Back to home">
          <BackIcon size={18} />
        </Link>
        <div>
          <p className="caption">Atlas Social Club</p>
          <h1 className={`brand-type ${s.title}`}>My passport</h1>
        </div>
      </div>

      <div className={s.top}>
        <Frame className={s.idCard} gap="var(--card)">
          <div className={s.idRow}>
            <div className={s.photo} aria-hidden="true">
              <svg viewBox="0 0 64 64" width="64" height="64">
                <path d="M4 54c8-18 26 2 24-14-1-9 8-14 14-13" fill="none" stroke="var(--wave)" strokeWidth="2.6" strokeDasharray="3 4" strokeLinecap="round" />
                <path d="M61 9L26 22l12 6z" fill="var(--card)" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round" />
                <path d="M61 9L38 28l4 13z" fill="var(--periwinkle)" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round" />
              </svg>
            </div>
            <div className={s.idText}>
              <span className="caption">Rank</span>
              <span className={`brand-type ${s.rank}`}>{rank}</span>
              <span className={s.level}>
                {found} {found === 1 ? 'country' : 'countries'} found
              </span>
            </div>
            <Stamp top="Member" big="ASC" bottom="since 2026" size={88} tilt={12} color="var(--coral-ink)" gapColor="var(--card)" className={s.idStamp} />
          </div>
          <div>
            <div className={s.xpRow}>
              <span>{next ? `${next.toGo} more ${next.toGo === 1 ? 'country' : 'countries'} to ${next.rank}` : 'Top rank reached'}</span>
              <span className="num">
                {found} / {next ? next.at : TOTAL_COUNTRIES}
              </span>
            </div>
            <div className={s.xpBar} role="progressbar" aria-valuemin={0} aria-valuemax={span} aria-valuenow={into} aria-label="Countries found towards the next rank">
              <div style={{ width: `${(into / span) * 100}%` }} />
            </div>
            <p className={s.nextRank}>
              {next
                ? `Find ${next.toGo} more on the map to become a${/^[AEIOU]/.test(next.rank) ? 'n' : ''} ${next.rank}.`
                : 'You’re a Globetrotter. Can you find all 197?'}
            </p>
          </div>
        </Frame>

        <ul className={s.stats}>
          <Stat label="Countries found" value={`${found}`} of={TOTAL_COUNTRIES} color="var(--mint)" to="/map-hunt" />
          <Stat label="Day streak" value={`${liveStreak(p)}`} sub={`days played in a row · best ${p.streak.best}`} color="var(--apricot)" />
          <Stat label="Voyages sailed" value={`${voyages}`} sub={voyageStreak(p) > 1 ? `${voyageStreak(p)} days running` : 'one a day, five stops'} color="var(--lilac)" to="/daily" />
          <Stat label="Accuracy" value={acc === null ? '–' : `${acc}%`} sub={`${p.answers.correct} of ${p.answers.total} answers`} color="var(--butter)" />
        </ul>
      </div>

      {empty && (
        <p className={s.empty}>
          <span className="hand">fresh passport!</span> Play any game and your stamps will start appearing here.
        </p>
      )}

      <section className={s.section} aria-labelledby="atlas-title">
        <div className={s.sectionHead}>
          <h2 id="atlas-title" className={`brand-type ${s.h2}`}>
            Your atlas
          </h2>
        </div>
        <AtlasMap found={p.found} />
        <ul className={s.continents}>
          {REGIONS.map((r) => {
            const { found: f, total } = regions[r.id];
            return (
              <li key={r.id}>
                <span className={s.contDot} style={{ background: f ? r.color : undefined }} data-empty={f === 0}>
                  {f === total ? <CheckIcon size={22} title={`All of ${r.label} found`} /> : f}
                </span>
                <span className={s.contName}>{r.label}</span>
                <span className={s.contTotal}>of {total}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className={s.twoUp}>
        <section className={s.panel} aria-labelledby="times-title">
          <h2 id="times-title" className={`brand-type ${s.h3}`}>
            Map Hunt best times
          </h2>
          <ul className={s.list}>
            {MAP_CHOICES.map((m) => {
              const t = p.bestTimes[m.id];
              return (
                <li key={m.id}>
                  <span className={s.swatch} style={{ background: m.color }} />
                  <span className={s.listName}>{m.short}</span>
                  <span className={`num ${s.listValue}`}>{t === undefined ? '–' : formatDuration(t)}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={s.panel} aria-labelledby="rounds-title">
          <h2 id="rounds-title" className={`brand-type ${s.h3}`}>
            Best quiz rounds
          </h2>
          <ul className={s.list}>
            {[
              ['flags:guess', 'Whose flag?', 'var(--blush)'],
              ['flags:find', 'Pick the flag', 'var(--blush)'],
              ['capitals:to-capital', 'Country → capital', 'var(--periwinkle)'],
              ['capitals:to-country', 'Capital → country', 'var(--periwinkle)'],
            ].map(([key, label, color]) => {
              const r = p.bestRounds[key];
              return (
                <li key={key}>
                  <span className={s.swatch} style={{ background: color }} />
                  <span className={s.listName}>
                    {label}
                    {r && <span className={s.listWhere}>{roundWhere(r)}</span>}
                  </span>
                  <span className={`num ${s.listValue}`}>{r ? roundScore(r) : '–'}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <AnotherLook p={p} />

      <section className={s.section} aria-labelledby="voyages-title">
        <div className={s.sectionHead}>
          <h2 id="voyages-title" className={`brand-type ${s.h2}`}>
            Voyage stamps
          </h2>
          <Link to="/daily" className={s.textLink}>
            Today’s voyage
          </Link>
        </div>
        <VoyageStamps daily={p.daily} />
      </section>

      <ResetSection />
    </div>
  );
}

const LOOK_LISTS: { kind: MissKind; title: string; color: string; to: string; play: string }[] = [
  { kind: 'map', title: 'On the map', color: 'var(--mint)', to: '/map-hunt', play: 'Map Hunt' },
  { kind: 'flags', title: 'Flags', color: 'var(--blush)', to: '/flag-spotter', play: 'Flag Spotter' },
  { kind: 'capitals', title: 'Capitals', color: 'var(--periwinkle)', to: '/capital-hop', play: 'Capital Hop' },
];

/** The countries you most recently got wrong: what's worth practising next. */
function AnotherLook({ p }: { p: Progress }) {
  const [open, setOpen] = useState<Country | null>(null);
  return (
    <section className={s.section} aria-labelledby="look-title">
      <div className={s.sectionHead}>
        <h2 id="look-title" className={`brand-type ${s.h2}`}>
          Worth another look
        </h2>
        <span className={s.sectionNote}>the ones you missed lately · they leave once you get them right</span>
      </div>
      <div className={s.lookGrid}>
        {LOOK_LISTS.map((l) => {
          const codes = recentMisses(p, l.kind);
          return (
            <div key={l.kind} className={s.lookCol} style={{ ['--tint' as string]: l.color }}>
              <h3 className={s.lookTitle}>{l.title}</h3>
              {codes.length ? (
                <ul className={s.lookList}>
                  {codes.map((code) => {
                    const c = getCountry(code);
                    if (!c) return null;
                    return (
                      <li key={code}>
                        <button type="button" onClick={() => setOpen(c)}>
                          <span className={s.lookFlag}>
                            <Flag country={c} alt="" />
                          </span>
                          <span>
                            {l.kind === 'capitals' ? (
                              <>
                                {c.name} <span className={s.lookCapital}>→ {c.capitals.join(' · ')}</span>
                              </>
                            ) : (
                              c.name
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={s.lookEmpty}>Nothing here. Countries you miss in {l.play} will show up for a second look.</p>
              )}
              <Link to={l.to} className={s.textLink}>
                Play {l.play}
              </Link>
            </div>
          );
        })}
      </div>
      {open && <FlagDetails country={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Stat({ label, value, of, sub, color, to }: { label: string; value: string; of?: number; sub?: string; color: string; to?: string }) {
  const body = (
    <>
      <span className="caption">{label}</span>
      <span className={`brand-type num ${s.statValue}`}>
        {value}
        {of !== undefined && <small> / {of}</small>}
      </span>
      {sub && <span className={s.statSub}>{sub}</span>}
    </>
  );
  return (
    <li className={s.stat} style={{ ['--tint' as string]: color }}>
      {to ? (
        <Link to={to} className={s.statLink}>
          {body}
        </Link>
      ) : (
        <div className={s.statLink}>{body}</div>
      )}
    </li>
  );
}

function AtlasMap({ found }: { found: Record<string, number> }) {
  const [shapes, setShapes] = useState<MapShape[] | null>(null);
  useEffect(() => {
    loadShapes().then(setShapes, () => setShapes([]));
  }, []);
  const view = useMemo(() => makeView('world'), []);
  const playable = useMemo(() => new Set(COUNTRIES.map((c) => c.code)), []);
  const looks = useMemo(() => new Map<string, Look>(Object.keys(found).map((c) => [c, 'found'])), [found]);
  return (
    <div className={s.atlas}>
      {shapes ? (
        <WorldMap view={view} shapes={shapes} playable={playable} looks={looks} colorOf={countryColor} label={`Your atlas: ${Object.keys(found).length} countries coloured in`} />
      ) : (
        <p className={`hand ${s.loading}`}>unfolding your atlas…</p>
      )}
    </div>
  );
}

function VoyageStamps({ daily }: { daily: Record<string, { edition: number; stars: number[] }> }) {
  const days = Object.entries(daily)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12);
  if (!days.length) return <p className={s.none}>No voyages yet. Today’s is waiting for you.</p>;
  return (
    <ul className={s.voyages}>
      {days.map(([day, v], i) => {
        const total = v.stars.reduce((a, b) => a + b, 0);
        const d = new Date(`${day}T12:00:00`);
        return (
          <li key={day}>
            <Stamp
              top={d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              big={`${total}/${v.stars.length * 3}`}
              bottom={`No. ${v.edition}`}
              size={104}
              tilt={((i * 7) % 15) - 7}
              color={total >= 12 ? 'var(--lagoon-ink)' : total >= 7 ? 'var(--coral-ink)' : 'var(--ink-soft)'}
            />
          </li>
        );
      })}
    </ul>
  );
}

function ResetSection() {
  const ref = useRef<HTMLDialogElement>(null);
  const [done, setDone] = useState(false);
  return (
    <section className={s.reset}>
      <div>
        <h2 className={`brand-type ${s.h3}`}>Start a fresh passport</h2>
        <p>Your progress is saved only in this browser. Resetting wipes every stamp, time and streak on this device.</p>
      </div>
      <Button variant="secondary" onClick={() => ref.current?.showModal()}>
        Reset my progress…
      </Button>
      {done && (
        <p className={s.resetDone} role="status">
          All cleared. Fresh pages await.
        </p>
      )}
      <dialog ref={ref} className={s.dialog} aria-labelledby="reset-title" onClick={(e) => e.target === ref.current && ref.current?.close()}>
        <div className={s.dialogBody}>
          <h2 id="reset-title" className={`brand-type ${s.h3}`}>
            Wipe everything?
          </h2>
          <p>This deletes every country found, best time, streak and voyage stamp on this device. It can’t be undone.</p>
          <div className={s.dialogActions}>
            <Button variant="secondary" onClick={() => ref.current?.close()} autoFocus>
              Keep my progress
            </Button>
            <Button
              className={s.danger}
              onClick={() => {
                resetProgress();
                ref.current?.close();
                setDone(true);
              }}
            >
              Yes, wipe it
            </Button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
