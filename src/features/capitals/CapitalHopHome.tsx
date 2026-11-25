// Capital Hop start screen: choose where and how hard, then a mode.
import { useState } from 'react';
import { Link } from 'react-router';
import { TOTAL_COUNTRIES } from '../../data/countries';
import type { Level, Scope } from '../../quiz/engine';
import { QuizSettings } from '../../quiz/QuizParts';
import { loadQuizPrefs, saveQuizPrefs } from '../../quiz/scopes';
import { useProgress } from '../../progress/store';
import { ArrowIcon, BackIcon, PlaneIcon } from '../../components/ui/Icons';
import type { RoundRecord } from '../../progress/store';
import { roundScore } from '../../quiz/rounds';
import s from './capitals.module.css';

export function CapitalHopHome() {
  const initial = loadQuizPrefs('capitals');
  const [scope, setScope] = useState<Scope>(initial.scope);
  const [level, setLevel] = useState<Level>(initial.level);
  const progress = useProgress();
  const q = `?region=${scope}&level=${level}`;

  const choose = (sc: Scope, lv: Level) => {
    setScope(sc);
    setLevel(lv);
    saveQuizPrefs('capitals', sc, lv);
  };

  return (
    <div className="page">
      <div className={s.head}>
        <Link to="/" className={s.back} aria-label="Back to home">
          <BackIcon size={18} />
        </Link>
        <div>
          <h1 className={`brand-type ${s.title}`}>Capital Hop</h1>
          <p className={s.sub}>
            From country to capital and back again<span className="hand"> · next stop, everywhere</span>
          </p>
        </div>
      </div>

      <QuizSettings scope={scope} level={level} onChange={choose} />
      {level === 'hard' && (
        <p className={s.trapNote}>
          <span className="hand">watch out:</span> Hard mode sneaks in famous non-capitals, like Sydney for Australia.
        </p>
      )}

      <ul className={s.modes}>
        <li>
          <Link to={`/capital-hop/to-capital${q}`} className={s.modeCard} style={{ background: 'var(--periwinkle)' }}>
            <div className={s.modeArt} aria-hidden="true">
              <div className={s.miniPass}>
                <span className={s.miniLabel}>From</span>
                <span className={`brand-type ${s.miniCity}`}>Mongolia</span>
                <span className={s.miniArrow}><PlaneIcon size={22} /></span>
                <span className={`brand-type ${s.miniCity}`}>???</span>
              </div>
            </div>
            <h2 className={`brand-type ${s.modeName}`}>Country → capital</h2>
            <p className={s.modeText}>We name a country, you pick its capital from four cities.</p>
            <ModeFoot best={progress.bestRounds['capitals:to-capital']} />
          </Link>
        </li>
        <li>
          <Link to={`/capital-hop/to-country${q}`} className={s.modeCard} style={{ background: 'var(--mint)' }}>
            <div className={s.modeArt} aria-hidden="true">
              <div className={s.miniPass}>
                <span className={s.miniLabel}>From</span>
                <span className={`brand-type ${s.miniCity}`}>Ulaanbaatar</span>
                <span className={s.miniArrow}><PlaneIcon size={22} /></span>
                <span className={`brand-type ${s.miniCity}`}>???</span>
              </div>
            </div>
            <h2 className={`brand-type ${s.modeName}`}>Capital → country</h2>
            <p className={s.modeText}>We name a capital, you work out which country it belongs to.</p>
            <ModeFoot best={progress.bestRounds['capitals:to-country']} />
          </Link>
        </li>
        <li>
          <Link to="/capital-hop/board" className={s.modeCard} style={{ background: 'var(--butter)' }}>
            <div className={s.modeArt} aria-hidden="true">
              <div className={s.miniBoard}>
                <span>Bhutan</span>
                <b>Thimphu</b>
                <span>Kenya</span>
                <b>Nairobi</b>
                <span>Peru</span>
                <b>Lima</b>
              </div>
            </div>
            <h2 className={`brand-type ${s.modeName}`}>Departures board</h2>
            <p className={s.modeText}>Browse all {TOTAL_COUNTRIES} countries and capitals, with notes on the tricky ones.</p>
            <div className={s.modeFoot}>
              <span className="num">{TOTAL_COUNTRIES} capitals</span>
              <span className={s.go}>
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
      <span className={s.go}>
        <ArrowIcon size={20} />
      </span>
    </div>
  );
}
