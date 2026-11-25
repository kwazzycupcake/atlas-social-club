// Today's voyage: five stops, one attempt a day, shareable result.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { COUNTRIES } from '../../data/countries';
import { loadShapes, type MapShape } from '../../map/geo';
import { makeView } from '../../map/views';
import { WorldMap, type Look, type WorldMapHandle } from '../../map/WorldMap';
import { countryColor } from '../../map/palette';
import { recordAnswer, recordDaily, recordFound, recordMissed, useProgress, voyageStreak, type DailyRecord } from '../../progress/store';
import { sounds } from '../../lib/sound';
import { Button, Frame, Stamp, Ticket } from '../../components/ui';
import { SoundToggle } from '../../components/ui/SoundToggle';
import { Confetti } from '../../components/ui/Confetti';
import { BackIcon, CheckIcon, StarIcon } from '../../components/ui/Icons';
import { KeyHint } from '../../quiz/QuizParts';
import { Flag } from '../flags/common';
import { choiceStars, mapStars, MAX_STARS_PER_STOP, msUntilNextVoyage, shareText, voyageFor, type Stop, type Voyage } from './voyage';
import s from './daily.module.css';

const KIND_LABEL = { map: 'Find it on the map', flag: 'Name the flag', capital: 'Pick the capital' } as const;
const KIND_COLOR = { map: 'var(--mint)', flag: 'var(--blush)', capital: 'var(--periwinkle)' } as const;

export function DailyPage() {
  const voyage = useMemo(() => voyageFor(), []);
  const done = useProgress().daily[voyage.day];
  return (
    <div className={`page ${s.page}`}>
      <div className={s.head}>
        <Link to="/" className={s.back} aria-label="Back to home">
          <BackIcon size={18} />
        </Link>
        <div className={s.headText}>
          <p className="caption">
            Today’s voyage · No. {voyage.edition} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className={`brand-type ${s.title}`}>Five stops, one little trip</h1>
        </div>
        <SoundToggle />
      </div>
      {done ? <Results voyage={voyage} record={done} /> : <Play voyage={voyage} />}
    </div>
  );
}

/* ---------- route across the top ---------- */
function Route({ voyage, at, stars }: { voyage: Voyage; at: number; stars: number[] }) {
  return (
    <ol className={s.route} aria-label="Your route">
      {voyage.stops.map((stop, i) => {
        const state = i < stars.length ? 'done' : i === at ? 'here' : 'ahead';
        return (
          <li key={i} className={s.stop} data-state={state} style={{ ['--stop' as string]: KIND_COLOR[stop.kind] }}>
            <span className={s.stopDot}>{state === 'done' ? <StarCount n={stars[i]} /> : i + 1}</span>
            <span className={s.stopLabel}>{stop.kind === 'map' ? 'Map' : stop.kind === 'flag' ? 'Flag' : 'Capital'}</span>
          </li>
        );
      })}
    </ol>
  );
}

function StarCount({ n }: { n: number }) {
  return (
    <span className={s.starCount} aria-label={`${n} of ${MAX_STARS_PER_STOP} stars`}>
      {n}
      <StarIcon size={13} />
    </span>
  );
}

/* ---------- playing ---------- */
function Play({ voyage }: { voyage: Voyage }) {
  const [at, setAt] = useState(0);
  const [stars, setStars] = useState<number[]>([]);
  const [answered, setAnswered] = useState<number | null>(null); // stars for the current stop, once answered
  const stop = voyage.stops[at];

  const finishStop = (n: number) => setAnswered(n);
  const next = () => {
    const all = [...stars, answered!];
    setStars(all);
    setAnswered(null);
    if (at + 1 < voyage.stops.length) setAt(at + 1);
    else {
      sounds.finish();
      const record: DailyRecord = { edition: voyage.edition, stars: all, finishedAt: Date.now() };
      recordDaily(voyage.day, record);
    }
  };

  return (
    <>
      <Route voyage={voyage} at={at} stars={answered === null ? stars : [...stars, answered]} />
      <Frame className={s.frame} gap="var(--card)">
        <div className={s.stopHead}>
          <span className={s.stopTag} style={{ background: KIND_COLOR[stop.kind] }}>
            Stop {at + 1} of 5 · {KIND_LABEL[stop.kind]}
          </span>
        </div>
        {stop.kind === 'map' && <MapStop key={at} stop={stop} onDone={finishStop} />}
        {stop.kind === 'flag' && <FlagStop key={at} stop={stop} onDone={finishStop} />}
        {stop.kind === 'capital' && <CapitalStop key={at} stop={stop} onDone={finishStop} />}
        {answered !== null && (
          <div className={s.after}>
            <p className={s.earned} data-good={answered > 0}>
              {answered === MAX_STARS_PER_STOP ? 'Perfect stop!' : answered > 0 ? 'Got there!' : 'Missed this one.'}{' '}
              <span className={s.earnedStars}>
                {Array.from({ length: MAX_STARS_PER_STOP }, (_, i) => (
                  <StarIcon key={i} size={22} filled={i < answered} />
                ))}
              </span>
            </p>
            <Button onClick={next} autoFocus>
              {at + 1 < voyage.stops.length ? 'Next stop →' : 'See my voyage →'}
            </Button>
          </div>
        )}
      </Frame>
    </>
  );
}

type StopProps<K extends Stop['kind']> = { stop: Extract<Stop, { kind: K }>; onDone: (stars: number) => void };

function MapStop({ stop, onDone }: StopProps<'map'>) {
  const [shapes, setShapes] = useState<MapShape[] | null>(null);
  useEffect(() => {
    loadShapes().then(setShapes, () => setShapes([]));
  }, []);
  const view = useMemo(() => makeView('world'), []);
  const playable = useMemo(() => new Set(COUNTRIES.map((c) => c.code)), []);
  const mapRef = useRef<WorldMapHandle>(null);
  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [result, setResult] = useState<'found' | 'revealed' | null>(null);

  const pick = (code: string) => {
    if (result) return;
    if (code === stop.answer.code) {
      setResult('found');
      sounds.correct(misses === 0);
      recordFound(code);
      onDone(mapStars(misses, true));
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setWrong(code);
    if (m >= 3) {
      setResult('revealed');
      sounds.reveal();
      recordMissed(stop.answer.code);
      mapRef.current?.zoomTo(stop.answer.code);
      onDone(0);
    } else sounds.wrong();
  };
  useEffect(() => {
    if (!wrong) return;
    const t = setTimeout(() => setWrong(null), 900);
    return () => clearTimeout(t);
  }, [wrong, misses]);

  const looks = useMemo(() => {
    const m = new Map<string, Look>();
    if (result === 'found') m.set(stop.answer.code, 'just-found');
    if (result === 'revealed') m.set(stop.answer.code, 'revealed');
    if (wrong && wrong !== stop.answer.code) m.set(wrong, 'wrong');
    return m;
  }, [result, wrong, stop.answer.code]);

  const name = (code: string | null) => COUNTRIES.find((c) => c.code === code)?.name;
  return (
    <div className={s.mapStop}>
      <div className={s.prompt}>
        <span className="caption">{result === 'revealed' ? 'It’s here:' : 'Find'}</span>
        <span className={`brand-type ${s.promptName}`}>{stop.answer.name}</span>
        <span className={s.tries} aria-label={`${3 - misses} tries left`}>
          {3 - Math.min(misses, 3)} {3 - misses === 1 ? 'try' : 'tries'} left
        </span>
      </div>
      <div className={s.mapBox}>
        {shapes ? (
          <WorldMap
            ref={mapRef}
            view={view}
            shapes={shapes}
            playable={playable}
            looks={looks}
            colorOf={countryColor}
            onPick={pick}
            label={`World map. Find ${stop.answer.name}.`}
          />
        ) : (
          <p className={`hand ${s.loading}`}>unfolding the map…</p>
        )}
        {wrong && !result && <p className={s.mapFeedback}>That’s {name(wrong)}.</p>}
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
  );
}

function useChoice(answerCode: string, kind: 'flags' | 'capitals', onDone: (stars: number) => void) {
  const [picked, setPicked] = useState<string | null>(null);
  const pick = (code: string) => {
    if (picked) return;
    setPicked(code);
    const right = code === answerCode;
    if (right) sounds.correct(true);
    else sounds.wrong();
    recordAnswer(kind, answerCode, right);
    onDone(choiceStars(right));
  };
  const stateOf = (code: string) => (!picked ? 'idle' : code === answerCode ? 'correct' : code === picked ? 'wrong' : 'muted');
  // keys 1–4
  return { picked, pick, stateOf };
}

function ChoiceKeys({ codes, picked, pick }: { codes: string[]; picked: string | null; pick: (c: string) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!picked && n >= 1 && n <= codes.length && !e.metaKey && !e.ctrlKey) pick(codes[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return null;
}

function FlagStop({ stop, onDone }: StopProps<'flag'>) {
  const { picked, pick, stateOf } = useChoice(stop.answer.code, 'flags', onDone);
  return (
    <div className={s.choiceStop}>
      <span className={s.bigStamp}>
        <Flag country={stop.answer} alt="The flag to identify" eager />
      </span>
      <div className={s.choiceSide}>
        <h2 className={`brand-type ${s.question}`}>Whose flag is this?</h2>
        <div className={s.options}>
          {stop.question.options.map((o, i) => {
            const st = stateOf(o.code);
            return (
              <Ticket key={o.code} state={st} onClick={() => pick(o.code)} disabled={!!picked} trailing={st === 'correct' ? <CheckIcon size={20} /> : <KeyHint n={i + 1} />}>
                {o.name}
              </Ticket>
            );
          })}
        </div>
        {picked && picked !== stop.answer.code && (
          <p className={s.correction}>
            It’s the flag of <b>{stop.answer.name}</b>.
          </p>
        )}
      </div>
      <ChoiceKeys codes={stop.question.options.map((o) => o.code)} picked={picked} pick={pick} />
    </div>
  );
}

function CapitalStop({ stop, onDone }: StopProps<'capital'>) {
  const { picked, pick, stateOf } = useChoice(stop.answer.code, 'capitals', onDone);
  const caps = stop.answer.capitals;
  return (
    <div className={s.choiceStop}>
      <div className={s.capitalCard}>
        <span className={s.capitalFlag}>
          <Flag country={stop.answer} alt="" eager />
        </span>
        <span className="caption">What is the capital of</span>
        <span className={`brand-type ${s.capitalCountry}`}>{stop.answer.name}?</span>
      </div>
      <div className={s.choiceSide}>
        <div className={s.options}>
          {stop.question.options.map((o, i) => {
            const st = stateOf(o.code);
            return (
              <Ticket key={o.code} state={st} onClick={() => pick(o.code)} disabled={!!picked} trailing={st === 'correct' ? <CheckIcon size={20} /> : <KeyHint n={i + 1} />}>
                {o.label}
              </Ticket>
            );
          })}
        </div>
        {picked && picked !== stop.answer.code && (
          <p className={s.correction}>
            {caps.length > 1 ? `${stop.answer.name}’s capitals are ` : `The capital is `}
            <b>{caps.join(' and ')}</b>.
          </p>
        )}
        {picked && stop.answer.capitalNote && <p className={s.note}>{stop.answer.capitalNote}</p>}
      </div>
      <ChoiceKeys codes={stop.question.options.map((o) => o.code)} picked={picked} pick={pick} />
    </div>
  );
}

/* ---------- finished ---------- */
function Results({ voyage, record }: { voyage: Voyage; record: DailyRecord }) {
  const progress = useProgress();
  const total = record.stars.reduce((a, b) => a + b, 0);
  const max = record.stars.length * MAX_STARS_PER_STOP;
  const streak = voyageStreak(progress);
  // celebrate a good voyage right after finishing, not on every revisit
  const [celebrate] = useState(() => total >= 9 && Date.now() - record.finishedAt < 15_000);
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null);
  const [left, setLeft] = useState(msUntilNextVoyage());
  useEffect(() => {
    const t = setInterval(() => setLeft(msUntilNextVoyage()), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = Math.floor(left / 3_600_000);
  const mm = Math.floor((left % 3_600_000) / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);

  const share = async () => {
    const text = shareText(record.edition, record.stars);
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setCopied('yes');
    } catch {
      setCopied('no');
    }
  };

  return (
    <>
      <Route voyage={voyage} at={-1} stars={record.stars} />
      {celebrate && <Confetti />}
      <Frame className={s.frame} gap="var(--card)">
        <div className={s.results}>
          <Stamp top={`Voyage No. ${record.edition}`} big={`${total}/${max}`} bottom="stars" size={136} tilt={-8} color="var(--coral-ink)" gapColor="var(--card)" />
          <h2 className={`brand-type ${s.resultTitle}`}>
            {total === max ? 'A flawless voyage!' : total >= max * 0.7 ? 'What a trip!' : total >= max * 0.4 ? 'Safe harbour!' : 'Choppy waters today!'}
          </h2>
          <ul className={s.recap}>
            {voyage.stops.map((stop, i) => (
              <li key={i}>
                <span className={s.recapFlag}>
                  <Flag country={stop.answer} alt="" />
                </span>
                <span className={s.recapText}>
                  <span className="caption">{KIND_LABEL[stop.kind]}</span>
                  <b>{stop.kind === 'capital' ? `${stop.answer.name} · ${stop.answer.capitals.join(' / ')}` : stop.answer.name}</b>
                </span>
                <span className={s.recapStars}>
                  {Array.from({ length: MAX_STARS_PER_STOP }, (_, k) => (
                    <StarIcon key={k} size={18} filled={k < record.stars[i]} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <div className={s.shareRow}>
            <Button onClick={share}>Share my result</Button>
            <span className={s.copied} aria-live="polite">
              {copied === 'yes' ? 'Copied! No spoilers inside.' : copied === 'no' ? 'Couldn’t copy on this browser.' : ''}
            </span>
          </div>
          <div className={s.meta}>
            <div>
              <span className="caption">Voyage streak</span>
              <b className="num">
                {streak} {streak === 1 ? 'day' : 'days'}
              </b>
            </div>
            <div>
              <span className="caption">Next voyage in</span>
              <b className="num">
                {hh}:{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
              </b>
            </div>
          </div>
          <p className={s.more}>
            Keep exploring: <Link to="/map-hunt">Map Hunt</Link> · <Link to="/flag-spotter">Flag Spotter</Link> · <Link to="/capital-hop">Capital Hop</Link>
          </p>
        </div>
      </Frame>
    </>
  );
}
