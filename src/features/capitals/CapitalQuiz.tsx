// Capital Hop rounds: country → capital, and capital → country.
import { useCallback } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { current, LEVELS, type Level, type QuizState, type Scope } from '../../quiz/engine';
import { buildCapitalRound, type CapitalMode, type CapitalOption, type CapitalQuestion } from '../../quiz/capitals';
import { isLevel, isScope, ROUND_LENGTH, SCOPES } from '../../quiz/scopes';
import { useQuizRound } from '../../quiz/useQuizRound';
import { KeyHint, QuizFeedback, QuizFinish, QuizHint, QuizProgress, quizStyles as q, QuizTopBar } from '../../quiz/QuizParts';
import type { Country } from '../../data/countries';
import { Frame, Ticket } from '../../components/ui';
import { CheckIcon, PlaneIcon } from '../../components/ui/Icons';
import s from './capitals.module.css';

export const CAPITAL_MODE_TITLE: Record<CapitalMode, string> = {
  'to-capital': 'Country → capital',
  'to-country': 'Capital → country',
};

export function CapitalQuiz() {
  const { mode } = useParams();
  const [params] = useSearchParams();
  if (mode !== 'to-capital' && mode !== 'to-country') return <Navigate to="/capital-hop" replace />;
  const scope: Scope = isScope(params.get('region')) ? (params.get('region') as Scope) : 'world';
  const level: Level = isLevel(params.get('level')) ? (params.get('level') as Level) : 'medium';
  return <Round key={`${mode}-${scope}-${level}`} mode={mode} scope={scope} level={level} />;
}

const listCapitals = (c: Country) =>
  c.capitals.length === 1 ? c.capitals[0] : `${c.capitals.slice(0, -1).join(', ')} and ${c.capitals[c.capitals.length - 1]}`;

function Round({ mode, scope, level }: { mode: CapitalMode; scope: Scope; level: Level }) {
  const make = useCallback(() => buildCapitalRound(mode, scope, ROUND_LENGTH, level, Math.random), [mode, scope, level]);
  const { quiz, question, pick, next, restart, answered, right, finished, bestBefore, newBest } = useQuizRound<CapitalQuestion>({
    make,
    kind: 'capitals',
    roundKey: `capitals:${mode}`,
    scope,
    level,
  });

  const sc = SCOPES.find((x) => x.id === scope)!;
  const levelLabel = LEVELS.find((l) => l.id === level)!.label;
  const missed = quiz.questions.filter((_, i) => quiz.results[i] === false);

  return (
    <div className={`page ${q.page}`}>
      <QuizTopBar
        backTo="/capital-hop"
        backLabel="Back to Capital Hop"
        caption={`Capital Hop · ${sc.label} · ${levelLabel}`}
        title={CAPITAL_MODE_TITLE[mode]}
        onRestart={restart}
      />

      <Frame className={q.quizFrame} gap="var(--card)">
        {finished ? (
          <QuizFinish
            quiz={quiz}
            bestBefore={bestBefore}
            newBest={newBest}
            onAgain={restart}
            review={
              missed.length > 0 && (
                <div className={q.review}>
                  <span className="caption">Worth another look</span>
                  <ul>
                    {missed.map((m) => (
                      <li key={m.answer.code}>
                        <img src={m.answer.flag} alt="" width={110} height={82} loading="lazy" />
                        <span>{m.answer.name}</span>
                        <small>{listCapitals(m.answer)}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            }
            links={
              <>
                <Link to="/capital-hop" className={q.textLink}>
                  Change settings
                </Link>
                <Link to="/capital-hop/board" className={q.textLink}>
                  Departures board
                </Link>
              </>
            }
          />
        ) : (
          question && (
            <>
              <QuizProgress quiz={quiz} noun="Stop" />
              <BoardingPass quiz={quiz} mode={mode} color={sc.color} onPick={pick} />
              <QuizFeedback
                quiz={quiz}
                answered={answered}
                right={right}
                wrongText={<WrongText question={question} picked={quiz.picked!} mode={mode} />}
                extra={
                  question.answer.capitalNote && (
                    <div className={s.note}>
                      <span className="hand">{question.answer.capitals.length > 1 ? `${question.answer.capitals.length} capitals!` : 'good to know'}</span>
                      <p>{question.answer.capitalNote}</p>
                    </div>
                  )
                }
                onNext={next}
                nextLabel="Next stop →"
              />
            </>
          )
        )}
      </Frame>
      <QuizHint />
    </div>
  );
}

function WrongText({ question, picked, mode }: { question: CapitalQuestion; picked: string; mode: CapitalMode }) {
  const { answer, city } = question;
  const chosen = question.options.find((o) => o.code === picked);
  if (mode === 'to-country') {
    return (
      <>
        Not quite. <b>{city}</b> is the capital of <b>{answer.name}</b>.
      </>
    );
  }
  if (chosen && !chosen.country) {
    return (
      <>
        {chosen.label} is a big city, but not the capital. {answer.name}’s is <b>{listCapitals(answer)}</b>.
      </>
    );
  }
  return (
    <>
      Not quite. {answer.capitals.length > 1 ? `${answer.name}’s capitals are` : `The capital of ${answer.name} is`} <b>{listCapitals(answer)}</b>.
    </>
  );
}

function BoardingPass({
  quiz,
  mode,
  color,
  onPick,
}: {
  quiz: QuizState<CapitalQuestion>;
  mode: CapitalMode;
  color: string;
  onPick: (code: string) => void;
}) {
  const qn = current(quiz)!;
  const answered = quiz.picked !== null;
  const from = mode === 'to-capital' ? qn.answer.name : qn.city;
  const to = mode === 'to-capital' ? qn.city : qn.answer.name;

  const stateOf = (o: CapitalOption) => {
    if (!answered) return 'idle' as const;
    if (o.code === qn.answer.code) return 'correct' as const;
    if (o.code === quiz.picked) return 'wrong' as const;
    return 'muted' as const;
  };

  return (
    <div className={s.pass} key={qn.answer.code}>
      <div className={s.passStrip} style={{ background: color }}>
        <span className="brand-type">Boarding pass</span>
        <span className={s.flight}>Flight AS-{String(quiz.index + 1).padStart(3, '0')}</span>
      </div>
      <div className={s.passBody}>
        <div className={s.route}>
          <div className={s.leg}>
            <span className="caption">{mode === 'to-capital' ? 'From the country' : 'From the capital'}</span>
            <span className={`brand-type ${s.place}`}>{from}</span>
          </div>
          <span className={s.flightPath} aria-hidden="true">
            <PlaneIcon size={34} />
          </span>
          <div className={s.leg}>
            <span className="caption">{mode === 'to-capital' ? 'To its capital' : 'To its country'}</span>
            <span className={`brand-type ${s.place}`} data-unknown={!answered}>
              {answered ? to : '???'}
            </span>
          </div>
        </div>
        <div className={s.options}>
          {qn.options.map((o, i) => {
            const st = stateOf(o);
            return (
              <Ticket
                key={o.code}
                state={st}
                onClick={() => onPick(o.code)}
                disabled={answered}
                trailing={st === 'correct' ? <CheckIcon size={20} /> : <KeyHint n={i + 1} />}
              >
                <span className={s.optionInner}>
                  {mode === 'to-country' && answered && o.country && <img src={o.country.flag} alt="" className={s.optionFlag} />}
                  {o.label}
                </span>
              </Ticket>
            );
          })}
        </div>
      </div>
    </div>
  );
}
