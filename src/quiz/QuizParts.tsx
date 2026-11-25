// Shared pieces of a quiz screen (Flag Spotter, Capital Hop).
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, Stamp } from '../components/ui';
import { SoundToggle } from '../components/ui/SoundToggle';
import { Confetti } from '../components/ui/Confetti';
import { BackIcon } from '../components/ui/Icons';
import type { RoundRecord } from '../progress/store';
import { roundScore, roundWhere } from './rounds';
import { LEVELS, quizSummary, type Level, type QuestionLike, type QuizState, type Scope } from './engine';
import { SCOPES } from './scopes';
import s from './quiz.module.css';

export { s as quizStyles };

export function QuizTopBar({
  backTo,
  backLabel,
  caption,
  title,
  onRestart,
}: {
  backTo: string;
  backLabel: string;
  caption: string;
  title: string;
  onRestart: () => void;
}) {
  return (
    <div className={s.topBar}>
      <div className={s.titleRow}>
        <Link to={backTo} className={s.back} aria-label={backLabel}>
          <BackIcon size={18} />
        </Link>
        <div>
          <p className="caption">{caption}</p>
          <h1 className={`brand-type ${s.quizTitle}`}>{title}</h1>
        </div>
      </div>
      <div className={s.topChips}>
        <SoundToggle />
        <Button variant="secondary" size="small" onClick={onRestart}>
          Restart
        </Button>
      </div>
    </div>
  );
}

export function QuizProgress({ quiz, noun }: { quiz: QuizState<QuestionLike>; noun: string }) {
  const st = quizSummary(quiz);
  return (
    <div className={s.qHead}>
      <span className="caption">
        {noun} {quiz.index + 1} of {quiz.questions.length}
      </span>
      <div
        className={s.qBar}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={quiz.questions.length}
        aria-valuenow={quiz.index}
        aria-label="Progress through this round"
      >
        <div style={{ width: `${(quiz.index / quiz.questions.length) * 100}%` }} />
      </div>
      <span className={`num ${s.accuracy}`}>{st.answered ? `${st.accuracy}% right` : ' '}</span>
    </div>
  );
}

/** "Spot on! +12" or the correction, plus a Next button after a miss. */
export function QuizFeedback({
  quiz,
  answered,
  right,
  wrongText,
  extra,
  onNext,
  nextLabel,
}: {
  quiz: QuizState<QuestionLike>;
  answered: boolean;
  right: boolean;
  wrongText: ReactNode;
  /** shown after any answer, e.g. a note about two capitals */
  extra?: ReactNode;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <div className={s.feedbackArea} aria-live="polite">
      {answered && extra}
      <div className={s.feedbackRow}>
        {answered && (
          <p className={s.feedback} data-tone={right ? 'good' : 'bad'} key={quiz.index}>
            {right ? (
              'Spot on!'
            ) : (
              wrongText
            )}
          </p>
        )}
        {answered && !right && <Button onClick={onNext}>{nextLabel}</Button>}
      </div>
    </div>
  );
}

export function KeyHint({ n }: { n: number }) {
  return <span className={s.keyHint}>{n}</span>;
}

export function QuizFinish({
  quiz,
  bestBefore,
  newBest,
  onAgain,
  review,
  links,
}: {
  quiz: QuizState<QuestionLike>;
  /** the best round for this mode before this one */
  bestBefore?: RoundRecord;
  /** this round beat it */
  newBest: boolean;
  onAgain: () => void;
  /** what the player missed, already rendered */
  review?: ReactNode;
  links: ReactNode;
}) {
  const st = quizSummary(quiz);
  const best = newBest || !bestBefore ? null : bestBefore;
  return (
    <div className={s.finish}>
      {(st.correct === st.total || (newBest && bestBefore)) && <Confetti />}
      <Stamp top="Round" big={`${st.correct}/${st.total}`} bottom="complete" size={122} tilt={-8} gapColor="var(--card)" />
      <h2 className={`brand-type ${s.finishTitle}`}>
        {st.correct === st.total ? 'A perfect round!' : st.accuracy >= 75 ? 'Sharp work!' : st.accuracy >= 50 ? 'Nicely done!' : 'Every answer counts!'}
      </h2>
      <dl className={s.results}>
        <div>
          <dt>Right</dt>
          <dd className="num">
            {st.correct}
            <small> / {st.total}</small>
          </dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd className="num">{st.accuracy}%</dd>
        </div>
        <div>
          <dt>Your best</dt>
          <dd className="num">{best ? roundScore(best) : `${st.correct} / ${st.total}`}</dd>
          {best && <dd className={s.bestWhere}>{roundWhere(best)}</dd>}
        </div>
      </dl>
      {newBest && bestBefore && <p className={`hand ${s.newBest}`}>your best round yet!</p>}
      {review}
      <div className={s.finishActions}>
        <Button onClick={onAgain}>Play again</Button>
        {links}
      </div>
    </div>
  );
}

/** "Where" + "How hard" chooser on a quiz start screen. */
export function QuizSettings({
  scope,
  level,
  onChange,
}: {
  scope: Scope;
  level: Level;
  onChange: (scope: Scope, level: Level) => void;
}) {
  return (
    <section className={s.settings} aria-label="Round settings">
      <div className={s.setting}>
        <span className="caption">Where</span>
        <div className={s.chips} role="group" aria-label="Region">
          {SCOPES.map((sc) => (
            <button
              key={sc.id}
              type="button"
              aria-pressed={scope === sc.id}
              style={{ background: scope === sc.id ? sc.color : undefined }}
              onClick={() => onChange(sc.id, level)}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>
      <div className={s.setting}>
        <span className="caption">How hard</span>
        <div className={s.levels} role="group" aria-label="Difficulty">
          {LEVELS.map((l) => (
            <button key={l.id} type="button" aria-pressed={level === l.id} onClick={() => onChange(scope, l.id)}>
              {l.label}
            </button>
          ))}
        </div>
        <p className={s.levelHint}>{LEVELS.find((l) => l.id === level)!.hint}</p>
      </div>
    </section>
  );
}

export function QuizHint() {
  return (
    <p className={s.hint}>
      Keys <kbd>1</kbd>–<kbd>4</kbd> to answer · <kbd>Enter</kbd> for the next one
    </p>
  );
}
