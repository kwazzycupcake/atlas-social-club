import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { countriesIn, getCountry } from '../../data/countries';
import { loadShapes, type MapShape } from '../../map/geo';
import { makeView, type ViewId } from '../../map/views';
import { WorldMap, type Look, type WorldMapHandle } from '../../map/WorldMap';
import { countryColor } from '../../map/palette';
import { sounds } from '../../lib/sound';
import { SoundToggle } from '../../components/ui/SoundToggle';
import { Confetti } from '../../components/ui/Confetti';
import { getProgress, recordFound, recordMissed, recordTime, useProgress } from '../../progress/store';
import { formatDuration } from '../../lib/format';
import { Button, Stamp } from '../../components/ui';
import { LogoMark } from '../../components/layout/Logo';
import { Hills } from '../../map/Scenery';
import scenery from '../../map/scenery.module.css';
import { BackIcon, HeartIcon } from '../../components/ui/Icons';
import { currentCode, elapsedMs, initialState, makeOrder, MAX_TRIES, reducer, summary, type GameState, type HeadStart } from './engine';
import { dayKey } from '../../lib/daily';
import { useAwayPause } from '../../lib/useAwayPause';
import { PausedCard } from '../../components/ui/PausedCard';
import { choiceFor, isMapChoice, MAP_CHOICES } from './regions';
import s from './mapHunt.module.css';

const colorOf = countryColor;

const CORRECT_PAUSE_MS = 550; // just long enough to see the name tag pop up, then straight on
const WRONG_FLASH_MS = 900;

const orderFor = (region: ViewId, first?: string | null) =>
  makeOrder(
    countriesIn(region).map((c) => c.code),
    first,
  );

export function MapHuntPage() {
  const { region } = useParams();
  if (!isMapChoice(region)) return <Navigate to="/map-hunt" replace />;
  // key: a different map is a brand-new game
  return <Game key={region} region={region} />;
}

function Game({ region }: { region: ViewId }) {
  const [params] = useSearchParams();
  const dare = params.get('find');
  // Arriving from the homepage dare: today's dare counts as question 1.
  const headStart = useMemo<HeadStart | null>(() => {
    if (params.get('from') !== 'dare') return null;
    const rec = getProgress().dares[dayKey()];
    if (!rec || !countriesIn(region).some((c) => c.code === rec.code)) return null;
    const outcome = rec.found ? (['first', 'second', 'third'] as const)[Math.min(rec.misses, 2)] : 'revealed';
    return { code: rec.code, outcome, ms: rec.ms };
  }, [params, region]);
  const navigate = useNavigate();
  const choice = choiceFor(region);

  const [shapes, setShapes] = useState<MapShape[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadMap = useCallback(() => {
    setLoadError(null);
    loadShapes().then(setShapes, (e: Error) => setLoadError(e.message));
  }, []);
  useEffect(loadMap, [loadMap]);

  const view = useMemo(() => makeView(region), [region]);
  const playable = useMemo(() => new Set(countriesIn(region).map((c) => c.code)), [region]);

  // The clock starts once the map is on screen, not while it is still loading.
  const [game, dispatch] = useReducer(reducer, undefined, () =>
    initialState(region, 'timed', orderFor(region, headStart?.code ?? dare), Date.now(), headStart),
  );
  const restart = useCallback(() => dispatch({ type: 'start', region, mode: 'timed', order: orderFor(region), now: Date.now() }), [region]);
  const started = useRef(false);
  useEffect(() => {
    if (shapes && !started.current) {
      started.current = true;
      dispatch({ type: 'start', region, mode: 'timed', order: game.order, now: Date.now(), headStart });
    }
  }, [shapes, region, game.order]);

  const mapRef = useRef<WorldMapHandle>(null);
  const target = currentCode(game);
  const targetCountry = target ? getCountry(target) : undefined;

  /* ---- wrong-tap flash ---- */
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!game.lastWrong) return;
    if (game.misses > 0 && game.phase === 'asking') sounds.wrong();
    setFlash(game.lastWrong);
    const t = setTimeout(() => setFlash(null), WRONG_FLASH_MS);
    return () => clearTimeout(t);
  }, [game.lastWrong, game.taps]);

  /* ---- side effects of each answer ---- */
  const zoomedForReveal = useRef(false);
  useEffect(() => {
    if (!target) return;
    if (game.phase === 'correct') {
      recordFound(target);
      sounds.correct(game.outcomes[target] === 'first');
      const t = setTimeout(() => dispatch({ type: 'next', now: Date.now() }), CORRECT_PAUSE_MS);
      return () => clearTimeout(t);
    }
    if (game.phase === 'revealed') {
      recordMissed(target);
      sounds.reveal();
      mapRef.current?.zoomTo(target);
      zoomedForReveal.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase, game.index]);

  const [newBest, setNewBest] = useState(false);
  useEffect(() => {
    if (game.phase === 'asking' && zoomedForReveal.current) {
      zoomedForReveal.current = false;
      mapRef.current?.reset();
    }
    if (game.phase === 'finished') {
      mapRef.current?.reset();
      if (game.order.length) sounds.finish();
      const allAnswered = game.order.length > 0 && Object.keys(game.outcomes).length === game.order.length;
      setNewBest(allAnswered && game.finishedAt !== null && recordTime(game.region, game.finishedAt - game.startedAt));
    } else setNewBest(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase, game.index]);

  /* ---- clock (waits for the map to load; pauses while the player is away) ---- */
  const paused = game.pausedAt !== null;
  const running = Boolean(shapes) && game.phase !== 'finished' && !paused;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);
  useAwayPause(running, (at) => dispatch({ type: 'pause', now: at }));
  const resume = () => {
    const t = Date.now();
    setNow(t); // so the clock doesn't flash a stale time on resume
    dispatch({ type: 'resume', now: t });
  };
  const elapsed = shapes ? elapsedMs(game, now) : 0;

  /* ---- keyboard: N / Enter = next, S = skip ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (game.pausedAt !== null) return;
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === 'n' || e.key === 'Enter') && game.phase === 'revealed') dispatch({ type: 'next', now: Date.now() });
      if (e.key === 's' && game.phase === 'asking') dispatch({ type: 'skip', now: Date.now() });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game.phase]);

  /* ---- how each country is drawn ---- */
  const looks = useMemo(() => {
    const m = new Map<string, Look>();
    for (const [code, o] of Object.entries(game.outcomes)) if (o !== 'revealed' && o !== 'skipped') m.set(code, 'found');
    if (target && game.phase === 'correct') m.set(target, 'just-found');
    if (target && game.phase === 'revealed') m.set(target, 'revealed');
    if (flash && !m.has(flash)) m.set(flash, 'wrong');
    return m;
  }, [game.outcomes, game.phase, target, flash]);

  const triesLeft = MAX_TRIES - game.misses;

  return (
    <div className={`page ${s.wrap}`}>
      {/* very wide maps (the World) get the full width, with the panel as a strip on top */}
      <div className={s.layout} data-wide={view.width / view.height > 1.6}>
      <div className={s.board}>
        <div className={s.mapFrame}>
        <div className={`${s.mapBox} ${scenery.grain}`}>
          {shapes ? (
            <WorldMap
              ref={mapRef}
              view={view}
              shapes={shapes}
              playable={playable}
              looks={looks}
              colorOf={colorOf}
              onPick={(code) => dispatch({ type: 'pick', code })}
              label={`Map of ${choice.label}. Find ${targetCountry?.name ?? ''}.`}
            />
          ) : (
            <div className={s.loading}>
              {loadError ? (
                <>
                  <p>The map didn’t load. {loadError}</p>
                  <Button onClick={loadMap}>Try again</Button>
                </>
              ) : (
                <p className="hand">unfolding the map…</p>
              )}
            </div>
          )}

          <Feedback game={game} />

          <div className={s.zoomBtns}>
            <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomBy(1.8)}>
              +
            </button>
            <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomBy(1 / 1.8)}>
              −
            </button>
            <button type="button" aria-label="Show the whole map" onClick={() => mapRef.current?.reset()}>
              <FitIcon />
            </button>
          </div>

          {paused && <PausedCard onResume={resume} />}

          {game.phase === 'finished' && (
            <Finish game={game} elapsed={elapsed} newBest={newBest} onAgain={restart} onPick={(id) => navigate(`/map-hunt/${id}`)} />
          )}
        </div>
        </div>
        <Hills className={s.hills} />
      </div>

      <Sidebar
        game={game}
        choice={choice}
        region={region}
        elapsed={elapsed}
        target={targetCountry}
        triesLeft={triesLeft}
        onRestart={restart}
        onSkip={() => dispatch({ type: 'skip', now: Date.now() })}
        onNext={() => dispatch({ type: 'next', now: Date.now() })}
      />
      </div>
    </div>
  );
}

/** The game panel beside the map: clock, score, restart, tries, progress, the country to find and what you've found. */
function Sidebar({
  game,
  choice,
  region,
  elapsed,
  target,
  triesLeft,
  onRestart,
  onSkip,
  onNext,
}: {
  game: GameState;
  choice: ReturnType<typeof choiceFor>;
  region: ViewId;
  elapsed: number;
  target: ReturnType<typeof getCountry>;
  triesLeft: number;
  onRestart: () => void;
  onSkip: () => void;
  onNext: () => void;
}) {
  const stats = summary(game);
  const best = useProgress().bestTimes[region];
  const done = Object.entries(game.outcomes);
  const toGo = stats.total - stats.answered;
  return (
    <aside className={s.sidebar} aria-label="Game panel">
      <div className={s.sideHead}>
        <Link to="/" className={s.home} aria-label="Atlas Social Club, home">
          <LogoMark size={42} />
        </Link>
        <Link to="/map-hunt" className={s.back} aria-label="Choose another map">
          <BackIcon size={18} />
        </Link>
        <div className={s.sideTitle}>
          <p className={`caption ${s.kicker}`}>Map Hunt</p>
          <h1 className={`display ${s.title}`}>{choice.label}</h1>
        </div>
      </div>

      <div className={s.statGrid}>
        <div className={s.statBox}>
          <span className="caption">Time</span>
          <span className={`num ${s.statBig}`} aria-label={`Time ${formatDuration(elapsed)}`}>
            {formatDuration(elapsed)}
          </span>
          <span className={s.statSmall}>{best === undefined ? 'no best yet' : `best ${formatDuration(best)}`}</span>
        </div>
        <div className={s.statBox}>
          <span className="caption">Score</span>
          <span className={`num ${s.statBig}`} aria-label={`${stats.found} of ${stats.total} found`}>
            {stats.found}
            <small> / {stats.total}</small>
          </span>
          <span className={s.statSmall}>{stats.firstTry} first try</span>
        </div>
      </div>

      <div className={s.sideRow}>
        <span className={s.hearts} aria-label={`${triesLeft} of ${MAX_TRIES} tries left`} role="img">
          {Array.from({ length: MAX_TRIES }, (_, i) => (
            <HeartIcon key={i} size={24} filled={i < triesLeft} />
          ))}
        </span>
        <span className={s.sideActions}>
          <SoundToggle />
          <Button variant="secondary" size="small" onClick={onRestart}>
            Restart
          </Button>
        </span>
      </div>

      <div className={s.progressBlock}>
        <div
          className={s.bar}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={stats.total}
          aria-valuenow={stats.answered}
          aria-label={`${stats.found} of ${stats.total} found`}
        >
          <div style={{ width: `${(stats.answered / Math.max(1, stats.total)) * 100}%` }} />
        </div>
        <span className={s.progressText}>
          {stats.found} found · {toGo} to go
        </span>
      </div>

      <div className={s.findCard} aria-live="polite" data-revealed={game.phase === 'revealed'}>
        {game.phase === 'finished' ? (
          <>
            <span className="caption">All done</span>
            <span className={`brand-type ${s.tagName}`}>{choice.short}</span>
          </>
        ) : (
          target && (
            <>
              <span className="caption">
                {game.phase === 'revealed' ? 'It’s here:' : `Find · ${Math.min(game.index + 1, stats.total)} of ${stats.total}`}
              </span>
              <span className={`brand-type ${s.tagName}`} key={target.code}>
                {target.name}
              </span>
              <div className={s.findActions}>
                {game.phase === 'revealed' ? (
                  <Button size="small" onClick={onNext}>
                    Next →
                  </Button>
                ) : (
                  <Button size="small" variant="secondary" onClick={onSkip} disabled={game.phase !== 'asking'}>
                    Skip
                  </Button>
                )}
              </div>
            </>
          )
        )}
      </div>

      <div className={s.foundList}>
        <p className="caption">Found {stats.found}</p>
        {done.length === 0 ? (
          <p className={s.foundEmpty}>Countries you find will line up here.</p>
        ) : (
          <ul>
            {done.map(([code, outcome]) => {
              const missed = outcome === 'revealed' || outcome === 'skipped';
              return (
                <li key={code} data-missed={missed}>
                  <span className={s.foundDot} style={{ background: missed ? undefined : colorOf(code) }} />
                  {getCountry(code)?.name}
                </li>
              );
            })}
          </ul>
        )}
        {toGo > 0 && <p className={s.stillToFind}>Still to find: {toGo}</p>}
      </div>

      <p className={s.hint}>
        Pinch or ⌘/Ctrl + scroll to zoom · drag to move · <kbd>Tab</kbd> to the map, arrows + <kbd>Enter</kbd> · <kbd>S</kbd> skips
      </p>
    </aside>
  );
}

function Feedback({ game }: { game: GameState }) {
  const target = currentCode(game);
  let text: string | null = null;
  let tone: 'good' | 'bad' | 'info' = 'info';
  if (game.phase === 'correct' && target) {
    const o = game.outcomes[target];
    text = o === 'first' ? 'Spot on!' : o === 'second' ? 'Got it!' : 'Phew! Got there.';
    tone = 'good';
  } else if (game.phase === 'revealed' && target) {
    text = game.outcomes[target] === 'skipped' ? 'Here it is. You’ll get it next time.' : 'Out of tries. It’s the pulsing one.';
  } else if (game.phase === 'asking' && game.lastWrong) {
    const name = getCountry(game.lastWrong)?.name;
    if (game.misses === 0) text = `You already found ${name}.`;
    else {
      text = `That’s ${name}. ${MAX_TRIES - game.misses} ${MAX_TRIES - game.misses === 1 ? 'try' : 'tries'} left.`;
      tone = 'bad';
    }
  }
  if (!text) return null;
  return (
    <div key={`${game.index}-${game.taps}-${game.phase}`} className={s.feedback} data-tone={tone} role="status">
      {text}
    </div>
  );
}

function Finish({
  game,
  elapsed,
  newBest,
  onAgain,
  onPick,
}: {
  game: GameState;
  elapsed: number;
  newBest: boolean;
  onAgain: () => void;
  onPick: (id: ViewId) => void;
}) {
  const st = summary(game);
  const others = MAP_CHOICES.filter((v) => v.id !== game.region);
  return (
    <div className={s.finishBackdrop}>
      {(newBest || st.found === st.total) && <Confetti />}
      <div className={s.finish} role="dialog" aria-labelledby="finish-title">
        <Stamp
          top="Complete"
          big={choiceFor(game.region).short}
          bottom={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          size={118}
          tilt={-8}
          gapColor="var(--card)"
        />
        <h2 id="finish-title" className={`brand-type ${s.finishTitle}`}>
          {st.found === st.total ? 'Every single one!' : st.found / Math.max(1, st.total) > 0.7 ? 'What a voyage!' : 'Land ho!'}
        </h2>
        <dl className={s.results}>
          <div>
            <dt>Time</dt>
            <dd className="num">{formatDuration(elapsed)}</dd>
          </div>
          <div>
            <dt>Found</dt>
            <dd className="num">
              {st.found}
              <small> / {st.total}</small>
            </dd>
          </div>
          <div>
            <dt>First try</dt>
            <dd className="num">{st.firstTry}</dd>
          </div>
        </dl>
        {newBest && <p className={`hand ${s.newBest}`}>new personal best!</p>}
        <div className={s.finishActions}>
          <Button onClick={onAgain}>Play again</Button>
          <Link to="/map-hunt" className={s.textLink}>
            All maps
          </Link>
        </div>
        <div className={s.tryOther}>
          <span className="caption">Try another</span>
          <div>
            {others.map((v) => (
              <button key={v.id} type="button" onClick={() => onPick(v.id)} style={{ background: v.color }}>
                {v.short}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


function FitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}
