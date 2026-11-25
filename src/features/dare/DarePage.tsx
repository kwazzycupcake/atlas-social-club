// Today's dare: "Bet you can't find ___." One country, three tries, then a
// proper win card and a gentle invitation to keep exploring.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { countriesIn, getCountry, REGIONS } from '../../data/countries';
import { dareCountryCode, dayKey } from '../../lib/daily';
import { formatDuration } from '../../lib/format';
import { sounds } from '../../lib/sound';
import { useAwayPause } from '../../lib/useAwayPause';
import { PausedCard } from '../../components/ui/PausedCard';
import { loadShapes, type MapShape } from '../../map/geo';
import { countryColor } from '../../map/palette';
import { makeView } from '../../map/views';
import { WorldMap, type Look, type WorldMapHandle } from '../../map/WorldMap';
import { recordDare, recordFound, recordMissed, useProgress, type DareRecord } from '../../progress/store';
import { ButtonLink, Chip, Stamp } from '../../components/ui';
import { LogoMark } from '../../components/layout/Logo';
import { Hills, SkyDecor } from '../../map/Scenery';
import scenery from '../../map/scenery.module.css';
import { Confetti } from '../../components/ui/Confetti';
import { SoundToggle } from '../../components/ui/SoundToggle';
import { BackIcon, HeartIcon } from '../../components/ui/Icons';
import { Flag } from '../flags/common';
import s from './dare.module.css';

const MAX_TRIES = 3;

/** "4.2s" under a minute, "1:07" after. */
const shortTime = (ms: number) => (ms < 60_000 ? `${(ms / 1000).toFixed(1)}s` : formatDuration(ms));

export function DarePage() {
  const day = dayKey();
  const country = getCountry(dareCountryCode())!;
  const region = country.continents[0];
  const regionLabel = REGIONS.find((r) => r.id === region)!.label;
  const progress = useProgress();
  const record = progress.dares[day];
  const voyageDone = Boolean(progress.daily[day]);

  const [shapes, setShapes] = useState<MapShape[] | null>(null);
  useEffect(() => {
    loadShapes().then(setShapes, () => setShapes([]));
  }, []);
  const view = useMemo(() => makeView(region), [region]);
  const playable = useMemo(() => new Set(countriesIn(region).map((c) => c.code)), [region]);
  const mapRef = useRef<WorldMapHandle>(null);

  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [justFinished, setJustFinished] = useState(false);

  // the clock starts when the map is on screen
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (shapes && !startedAt && !record) setStartedAt(Date.now());
  }, [shapes, startedAt, record]);
  // stops while the player is away; resuming moves the start forward
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const running = Boolean(startedAt) && !record && pausedAt === null;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [running]);
  useAwayPause(running, (at) => setPausedAt(at));
  const resume = () => {
    if (pausedAt === null) return;
    const away = Date.now() - pausedAt;
    setStartedAt((t) => (t === null ? t : t + away));
    setNow(Date.now());
    setPausedAt(null);
  };
  const elapsed = record ? record.ms : startedAt ? Math.max(0, (pausedAt ?? now) - startedAt) : 0;

  // a revealed dare zooms in so you can see where it was
  useEffect(() => {
    if (record && !record.found) mapRef.current?.zoomTo(record.code);
  }, [record, shapes]);

  const finish = (rec: DareRecord) => {
    recordDare(day, rec);
    setJustFinished(true);
  };

  // bring the result card into view as soon as the dare is decided
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!justFinished) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => cardRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }), 450);
    return () => clearTimeout(t);
  }, [justFinished]);

  const pick = (code: string) => {
    if (record || !startedAt || pausedAt !== null) return;
    const ms = Date.now() - startedAt;
    if (code === country.code) {
      sounds.correct(misses === 0);
      recordFound(code);
      finish({ code, found: true, misses, ms });
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setWrong(code);
    if (m >= MAX_TRIES) {
      sounds.reveal();
      recordMissed(country.code);
      finish({ code: country.code, found: false, misses: m, ms });
    } else sounds.wrong();
  };
  useEffect(() => {
    if (!wrong) return;
    const t = setTimeout(() => setWrong(null), 900);
    return () => clearTimeout(t);
  }, [wrong, misses]);

  const looks = useMemo(() => {
    const m = new Map<string, Look>();
    if (record) m.set(record.code, record.found ? 'just-found' : 'revealed');
    if (wrong && !record) m.set(wrong, 'wrong');
    return m;
  }, [record, wrong]);

  const triesLeft = record ? MAX_TRIES - Math.min(record.misses, MAX_TRIES) : MAX_TRIES - misses;
  const rest = countriesIn(region).length - 1;

  return (
    <div className={`page ${s.page}`}>
      <SkyDecor />
      <div className={s.topBar}>
        <div className={s.titleRow}>
          <Link to="/" className={s.home} aria-label="Atlas Social Club, home">
            <LogoMark size={50} />
          </Link>
          <Link to="/" className={s.back} aria-label="Back to home">
            <BackIcon size={18} />
          </Link>
          <div>
            <p className={`caption ${s.kicker}`}>Today’s dare · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</p>
            <h1 className={`brand-type ${s.title}`}>Bet you can’t find {country.name}.</h1>
          </div>
        </div>
        <div className={s.chips}>
          <Chip label={`Time ${shortTime(elapsed)}`}>
            <span className="num">{shortTime(elapsed)}</span>
          </Chip>
          <Chip label={`${triesLeft} of ${MAX_TRIES} tries left`}>
            {Array.from({ length: MAX_TRIES }, (_, i) => (
              <HeartIcon key={i} size={18} filled={i < triesLeft} />
            ))}
          </Chip>
          <SoundToggle />
        </div>
      </div>

      <div className={s.board}>
        {/* the dare's prompt sits on the map's top edge, like Map Hunt's */}
        {!record && (
          <p className={s.hint} aria-live="polite">
            It’s somewhere in {regionLabel}. {misses > 0 && wrong ? <b>That’s {getCountry(wrong)?.name}.</b> : 'Tap it on the map.'}
          </p>
        )}
        <div className={s.mapFrame}>
        <div className={`${s.mapBox} ${scenery.grain}`}>
          {shapes ? (
            <WorldMap
              ref={mapRef}
              view={view}
              shapes={shapes}
              playable={playable}
              looks={looks}
              colorOf={countryColor}
              onPick={record ? undefined : pick}
              label={`Map of ${regionLabel}. Find ${country.name}.`}
            />
          ) : (
            <p className={`hand ${s.loading}`}>unfolding the map…</p>
          )}
          {pausedAt !== null && !record && <PausedCard onResume={resume} />}
          <div className={s.zoomBtns}>
            <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomBy(1.8)}>
              +
            </button>
            <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomBy(1 / 1.8)}>
              −
            </button>
          </div>
        </div>
        </div>
        <Hills />
      </div>

      {record && (
        <section ref={cardRef} className={s.card} aria-labelledby="dare-result" aria-live="polite">
          {justFinished && record.found && <Confetti />}
          <div className={s.cardTop}>
            <span className={s.flag}>
              <Flag country={country} alt={`Flag of ${country.name}`} eager />
            </span>
            <div className={s.cardText}>
              <h2 id="dare-result" className={`brand-type ${s.cardTitle}`}>
                {record.found ? 'You proved us wrong!' : 'This one got away!'}
              </h2>
              <p className={s.cardLine}>
                {record.found ? (
                  <>
                    Found <b>{country.name}</b> in <b className="num">{shortTime(record.ms)}</b>
                    {record.misses === 0 ? ', first try.' : record.misses === 1 ? ', on the second try.' : ', on the last try. Phew!'}
                  </>
                ) : (
                  <>
                    <b>{country.name}</b> is the pulsing one on the map. A new dare arrives tomorrow.
                  </>
                )}
              </p>
            </div>
            <Stamp
              top="Dare"
              big={record.found ? 'Done' : 'Shown'}
              bottom={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              size={96}
              tilt={-10}
              color={record.found ? 'var(--lagoon-ink)' : 'var(--coral-ink)'}
              gapColor="var(--card)"
              className={s.stamp}
            />
          </div>
          <div className={s.next}>
            <span className="caption">Fancy more?</span>
            <div className={s.choices}>
              <ButtonLink to={`/map-hunt/${region}?from=dare`}>Find the rest of {regionLabel} →</ButtonLink>
              <ButtonLink to="/daily" variant="secondary">
                {voyageDone ? 'See today’s voyage' : 'Today’s voyage'}
              </ButtonLink>
              <Link to="/" className={s.homeLink}>
                Back home
              </Link>
            </div>
            <p className={s.small}>
              {rest} more {rest === 1 ? 'country' : 'countries'} to go in {regionLabel}; {country.name} already counts.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
