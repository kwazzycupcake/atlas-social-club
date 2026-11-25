import { Link } from 'react-router';
import { getCountry, REGIONS } from '../../data/countries';
import { DAILY_STOPS, dareCountryCode, dayKey, editionNumber, type StopKind } from '../../lib/daily';
import { foundByRegion, rankOf, useProgress, type Progress } from '../../progress/store';
import { ButtonLink, Frame, Stamp } from '../../components/ui';
import { ArrowIcon, CheckIcon, CityIcon, FlagIcon, MapIcon } from '../../components/ui/Icons';
import { formatDuration } from '../../lib/format';
import { bestOfRounds, roundScore } from '../../quiz/rounds';
import { FriendsTeaser } from '../friends/FriendsTeaser';
import { asset } from '../../lib/asset';
import s from './home.module.css';

export function HomePage() {
  const progress = useProgress();
  return (
    <div className={s.home}>
      {/* the dare on the left, the world spread out behind it on the right */}
      <div className={s.horizon}>
        <div className="page">
          <Hero progress={progress} />
        </div>
        <WorldPoster />
      </div>
      {/* the game cards sit on a bank of clouds */}
      <div className={s.cloudBank}>
        <Cloud className={s.cloudLeft} />
        <Cloud className={s.cloudRight} />
        <div className="page">
          <Games progress={progress} />
        </div>
      </div>
      <div className="page">
        <div className={s.twoUp}>
          <DailyVoyage progress={progress} />
          <PassportCard progress={progress} />
        </div>
      </div>
      <Hills />
    </div>
  );
}

function Cloud({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 440 200" className={className} aria-hidden="true">
      <path d="M0 150C30 92 98 84 136 112C166 48 268 44 304 104C340 76 404 86 426 130C446 134 452 160 440 200H0Z" />
    </svg>
  );
}

/** Rolling pastel hills along the bottom of the page. */
function Hills() {
  return (
    <div className={s.hills} aria-hidden="true">
      <svg viewBox="0 0 1440 240" preserveAspectRatio="none" className={s.hillLayers}>
        <path d="M0 110C160 40 320 50 480 100S820 30 1020 80 1320 40 1440 70V240H0Z" fill="#cfe3c3" />
        <path d="M0 160C200 110 380 120 560 150S900 100 1120 140 1360 120 1440 130V240H0Z" fill="var(--mint)" />
        <path d="M0 210C240 180 520 190 760 205S1200 180 1440 195V240H0Z" fill="var(--game-sea)" />
      </svg>
      <svg viewBox="0 0 60 44" className={`${s.trees} ${s.treesLeft}`}>
        <path d="M6 42L20 4 34 42Z" />
        <path d="M30 42L42 14 54 42Z" />
      </svg>
      <svg viewBox="0 0 34 44" className={`${s.trees} ${s.treesRight}`}>
        <path d="M3 42L17 2 31 42Z" />
      </svg>
      <svg viewBox="0 0 48 42" className={s.boat}>
        <path d="M2 28H46L40 38H8Z" fill="var(--coral)" />
        <path d="M24 28V2L42 24Z" fill="var(--card)" />
      </svg>
      <p className={`hand ${s.motto}`}>find · spot · hop</p>
    </div>
  );
}

function Hero({ progress }: { progress: Progress }) {
  // A new tricky country every day, the same for everyone.
  const dare = getCountry(dareCountryCode()) ?? getCountry('BTN')!;
  const done = progress.dares[dayKey()];
  return (
    <header className={s.hero}>
      <p className={`hand ${s.ahoy}`}>{done ? (done.found ? 'dare complete!' : 'so close!') : 'today’s dare'}</p>
      <h1 className={`brand-type ${s.title}`}>
        Bet you can’t find <span className={`marker-highlight ${s.dareName}`}>{dare.name}.</span>
        <span className={s.dareSub}>
          {done
            ? done.found
              ? `(You did, in ${done.ms < 60_000 ? `${(done.ms / 1000).toFixed(1)}s` : formatDuration(done.ms)}. Fair enough.)`
              : '(We win this one. New dare tomorrow.)'
            : '(Go on, prove us wrong.)'}
        </span>
      </h1>
      <p className={s.lede}>
        Tap countries, spot flags, hop between capitals.
      </p>
      <div className={s.heroActions}>
        {done ? (
          <ButtonLink to="/dare" size="large">
            <CheckIcon size={20} /> {done.found ? 'Dare done' : 'See where it was'}
          </ButtonLink>
        ) : (
          <ButtonLink to="/dare" size="large">
            Prove it <ArrowIcon size={20} />
          </ButtonLink>
        )}
        <ButtonLink to="/daily" variant="secondary" size="large">
          Today’s voyage
        </ButtonLink>
      </div>
    </header>
  );
}

function WorldPoster() {
  return (
    <section className={s.poster} aria-label="World map">
      <svg viewBox="0 0 240 150" className={s.flightPath} aria-hidden="true">
        <path d="M6 140C50 40 130 10 214 30" />
        <path d="M206 18L238 34 204 44 212 33Z" className={s.plane} />
      </svg>
      <svg viewBox="0 0 70 104" className={s.balloon} aria-hidden="true">
        <path d="M35 4C60 4 66 26 62 40 58 56 44 66 40 72H30C26 66 12 56 8 40 4 26 10 4 35 4Z" fill="var(--apricot)" />
        <path d="M35 4C26 20 26 52 32 72M35 4C44 20 44 52 38 72" fill="none" stroke="var(--coral)" />
        <path d="M31 72L30 84M39 72L40 84" fill="none" />
        <rect x="27" y="84" width="16" height="12" rx="2" fill="#e0b98a" />
      </svg>
      <div className={s.posterInner}>
        <img
          src={asset('art/world-pastel.svg?v=2')}
          alt="Illustrated pastel world map: every continent in its own colour, with waves, sailboats, a whale and a compass rose."
          width={1200}
          height={620}
          className={s.posterImg}
        />
        <svg viewBox="0 0 1200 620" className={s.route} aria-hidden="true">
          <path d="M297 391C430 250 600 280 732 342S980 210 1066 159" />
          {[
            [297, 391, 'var(--coral)'],
            [732, 342, 'var(--lagoon)'],
            [1066, 159, 'var(--sunshine)'],
          ].map(([x, y, fill]) => (
            <g key={`${x}`} transform={`translate(${x} ${y})`} className={s.pin}>
              <path d="M0 0c-9-12-14-18-14-25a14 14 0 0 1 28 0c0 7-5 13-14 25z" fill={String(fill)} />
              <circle cy="-25" r="5" fill="var(--card)" />
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

function Games({ progress }: { progress: Progress }) {
  const flagBest = bestOfRounds(progress.bestRounds, ['flags:guess', 'flags:find']);
  const capitalBest = bestOfRounds(progress.bestRounds, ['capitals:to-capital', 'capitals:to-country']);
  const best = Object.entries(progress.bestTimes).sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0))[0];
  const bestLabel = best
    ? `Best: ${REGIONS.find((r) => r.id === best[0])?.short ?? 'World'} ${formatDuration(best[1]!)}`
    : 'Not played yet';

  const games = [
    {
      to: '/map-hunt',
      title: 'Map Hunt',
      tag: 'Timed',
      color: 'var(--mint)',
      icon: <MapIcon size={52} />,
      text: 'We call out a country, you tap it. Colour in a whole continent against the clock.',
      stat: bestLabel,
    },
    {
      to: '/flag-spotter',
      title: 'Flag Spotter',
      tag: 'Look-alikes',
      color: 'var(--blush)',
      icon: <FlagIcon size={52} />,
      text: 'Name the flag, or pick it out of a line-up, from easy to look-alike hard.',
      stat: flagBest ? `Best round: ${roundScore(flagBest)}` : 'Not played yet',
    },
    {
      to: '/capital-hop',
      title: 'Capital Hop',
      tag: '4 choices',
      color: 'var(--periwinkle)',
      icon: <CityIcon size={52} />,
      text: 'From country to capital and back again, tricky two-capital countries included.',
      stat: capitalBest ? `Best round: ${roundScore(capitalBest)}` : 'Not played yet',
    },
  ];

  return (
    <section className={s.games} aria-labelledby="games-title">
      <div className={s.sectionHead}>
        <p className="caption">Pick a game</p>
        <h2 id="games-title" className={`display ${s.sectionTitle}`}>
          Three ways to play
        </h2>
      </div>
      <div className={s.gameGrid}>
        {games.map((g) => (
          <Link key={g.to} to={g.to} className={s.gameCard} style={{ background: g.color }}>
            <div className={s.gameTop}>
              <span className={s.gameIcon}>{g.icon}</span>
              <span className={`caption ${s.gameTag}`}>{g.tag}</span>
            </div>
            <h3 className={`display ${s.gameTitle}`}>{g.title}</h3>
            <p className={s.gameText}>{g.text}</p>
            <div className={s.gameFoot}>
              <span>{g.stat}</span>
              <span className={s.play}>
                Play <ArrowIcon size={18} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      <FriendsTeaser />
    </section>
  );
}

const STOP_LABEL: Record<StopKind, string> = { map: 'Find a country', flag: 'Name a flag', capital: 'Pick a capital' };

function DailyVoyage({ progress }: { progress: Progress }) {
  const today = new Date();
  const edition = editionNumber(today);
  const done = progress.daily[dayKey(today)];
  const total = done ? done.stars.reduce((a, b) => a + b, 0) : 0;
  const day = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
  const xs = [30, 160, 290, 420, 530];
  const ys = [60, 45, 40, 45, 30];

  return (
    <Frame as="section" className={s.daily} gap="var(--card)" aria-labelledby="daily-title">
      <div className={s.dailyHead}>
        <div>
          <p className="caption">Today’s voyage · No. {edition}</p>
          <h2 id="daily-title" className={`display ${s.dailyTitle}`}>
            Five stops,
            <br />
            one little trip
          </h2>
        </div>
        <Stamp top={day} big={String(today.getFullYear())} bottom="Daily" color="var(--coral-ink)" tilt={10} gapColor="var(--card)" size={96} />
      </div>
      <svg viewBox="0 0 560 90" className={s.dailyRoute} role="img" aria-label={`Five stops: ${DAILY_STOPS.map((k) => STOP_LABEL[k]).join(', ')}`}>
        <path d="M30 60C90 10 150 10 160 45S270 80 290 40 400 0 420 45 510 70 530 30" />
        {DAILY_STOPS.map((kind, i) => (
          <g key={i} transform={`translate(${xs[i]} ${ys[i]})`}>
            <circle r="17" fill={kind === 'map' ? 'var(--mint)' : kind === 'flag' ? 'var(--blush)' : 'var(--periwinkle)'} />
            <text y="6" textAnchor="middle">
              {done ? `${done.stars[i]}★` : i + 1}
            </text>
          </g>
        ))}
      </svg>
      <ul className={s.stopKey}>
        <li><span style={{ background: 'var(--mint)' }} />Map</li>
        <li><span style={{ background: 'var(--blush)' }} />Flag</li>
        <li><span style={{ background: 'var(--periwinkle)' }} />Capital</li>
      </ul>
      <div className={s.dailyFoot}>
        {done ? (
          <>
            <ButtonLink to="/daily" variant="secondary">
              See my voyage
            </ButtonLink>
            <span className={`hand ${s.dailyNote}`}>
              sailed today: {total}/{done.stars.length * 3} stars · back tomorrow!
            </span>
          </>
        ) : (
          <>
            <ButtonLink to="/daily">Begin today’s five</ButtonLink>
            <span className={`hand ${s.dailyNote}`}>same five for everyone today</span>
          </>
        )}
      </div>
    </Frame>
  );
}

function PassportCard({ progress }: { progress: Progress }) {
  const { rank, found, into, span, next } = rankOf(progress);
  const regions = foundByRegion(progress);
  return (
    <Frame as="aside" className={s.passport} gap="var(--card)" aria-labelledby="passport-title">
      <div className={s.passportHead}>
        <h2 id="passport-title" className={`display ${s.passportTitle}`}>
          My passport
        </h2>
        <Link to="/passport" className={s.textLink}>
          Open
        </Link>
      </div>
      <div>
        <div className={s.levelRow}>
          <span>{rank}</span>
          <span>{next ? `${next.toGo} more to ${next.rank}` : 'top rank!'}</span>
        </div>
        <div className={s.xpBar} role="progressbar" aria-valuemin={0} aria-valuemax={span} aria-valuenow={into} aria-label={`${found} countries found; next rank ${next?.rank ?? 'reached'}`}>
          <div style={{ width: `${(into / span) * 100}%` }} />
        </div>
      </div>
      <ul className={s.stamps}>
        {REGIONS.map((r) => {
          const { found, total } = regions[r.id];
          const done = found === total;
          return (
            <li key={r.id}>
              <span className={`display num ${s.regionStamp}`} data-empty={found === 0} style={{ background: found ? r.color : undefined }}>
                {done ? <CheckIcon size={26} title={`All of ${r.label} found`} /> : found}
              </span>
              <span className={s.regionName}>{r.short}</span>
              <span className={`num ${s.regionTotal}`}>of {total}</span>
            </li>
          );
        })}
      </ul>
      {Object.keys(progress.found).length === 0 && <p className={`hand ${s.passportNote}`}>fresh passport: no stamps yet!</p>}
    </Frame>
  );
}
