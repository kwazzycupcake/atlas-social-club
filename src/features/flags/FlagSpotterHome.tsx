// Flag Spotter start screen: choose where and how hard, then a mode.
import { useState } from 'react';
import { Link } from 'react-router';
import { getCountry, TOTAL_COUNTRIES } from '../../data/countries';
import type { Level, Scope } from '../../quiz/engine';
import { QuizSettings } from '../../quiz/QuizParts';
import { useProgress } from '../../progress/store';
import { ArrowIcon, BackIcon } from '../../components/ui/Icons';
import { Flag, loadFlagPrefs, saveFlagPrefs } from './common';
import type { RoundRecord } from '../../progress/store';
import { roundScore } from '../../quiz/rounds';
import s from './flags.module.css';

export function FlagSpotterHome() {
  const initial = loadFlagPrefs();
  const [scope, setScope] = useState<Scope>(initial.scope);
  const [level, setLevel] = useState<Level>(initial.level);
  const progress = useProgress();
  const q = `?region=${scope}&level=${level}`;

  const choose = (sc: Scope, lv: Level) => {
    setScope(sc);
    setLevel(lv);
    saveFlagPrefs(sc, lv);
  };

  const f = (code: string) => getCountry(code)!;

  return (
    <div className="page">
      <div className={s.head}>
        <Link to="/" className={s.back} aria-label="Back to home">
          <BackIcon size={18} />
        </Link>
        <div>
          <h1 className={`brand-type ${s.title}`}>Flag Spotter</h1>
          <p className={s.sub}>
            Name the flag, or pick it out of a line-up<span className="hand"> · how many can you spot?</span>
          </p>
        </div>
      </div>

      <QuizSettings scope={scope} level={level} onChange={choose} />

      <ul className={s.modes}>
        <li>
          <Link to={`/flag-spotter/guess${q}`} className={s.modeCard} style={{ background: 'var(--blush)' }}>
            <div className={s.modeArt}>
              <span className={s.artStamp}>
                <Flag country={f('KGZ')} alt="" eager />
              </span>
              <span className={`brand-type ${s.artQ}`}>?</span>
            </div>
            <h2 className={`brand-type ${s.modeName}`}>Whose flag?</h2>
            <p className={s.modeText}>We show a flag, you pick the country from four names.</p>
            <ModeFoot best={progress.bestRounds['flags:guess']} />
          </Link>
        </li>
        <li>
          <Link to={`/flag-spotter/find${q}`} className={s.modeCard} style={{ background: 'var(--periwinkle)' }}>
            <div className={s.modeArt}>
              <span className={s.artTag}>Japan</span>
              <span className={s.artGrid}>
                {['BGD', 'JPN', 'PLW', 'KOR'].map((c) => (
                  <Flag key={c} country={f(c)} alt="" eager />
                ))}
              </span>
            </div>
            <h2 className={`brand-type ${s.modeName}`}>Pick the flag</h2>
            <p className={s.modeText}>We name a country, you pick its flag out of a line-up of four.</p>
            <ModeFoot best={progress.bestRounds['flags:find']} />
          </Link>
        </li>
        <li>
          <Link to="/flag-spotter/album" className={s.modeCard} style={{ background: 'var(--butter)' }}>
            <div className={s.modeArt}>
              <span className={s.artFan}>
                {['BRA', 'NPL', 'SYC'].map((c) => (
                  <span key={c} className={s.artStamp}>
                    <Flag country={f(c)} alt="" eager />
                  </span>
                ))}
              </span>
            </div>
            <h2 className={`brand-type ${s.modeName}`}>Stamp album</h2>
            <p className={s.modeText}>Leaf through all {TOTAL_COUNTRIES} flags, search them, and tap one for a closer look.</p>
            <div className={s.modeFoot}>
              <span className="num">{TOTAL_COUNTRIES} flags</span>
              <span className={s.go} aria-hidden="true">
                <ArrowIcon size={20} />
              </span>
            </div>
          </Link>
        </li>
      </ul>
    </div>
  );
}

function ModeFoot({ best }: { best?: RoundRecord }) {
  return (
    <div className={s.modeFoot}>
      <span className="num">{best ? `Best round: ${roundScore(best)}` : 'Not played yet'}</span>
      <span className={s.go} aria-hidden="true">
        <ArrowIcon size={20} />
      </span>
    </div>
  );
}
