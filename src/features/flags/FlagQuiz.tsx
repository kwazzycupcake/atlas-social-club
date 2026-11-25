// "Whose flag?" (flag → 4 names) and "Pick the flag" (name → 4 flags).
import { useCallback } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { buildRound, current, FLAG_RULES, LEVELS, type Level, type Question, type QuizState, type Scope } from '../../quiz/engine';
import { useQuizRound } from '../../quiz/useQuizRound';
import { KeyHint, QuizFeedback, QuizFinish, QuizHint, QuizProgress, quizStyles as q, QuizTopBar } from '../../quiz/QuizParts';
import type { Country } from '../../data/countries';
import { Frame, Ticket } from '../../components/ui';
import { CheckIcon } from '../../components/ui/Icons';
import { Flag, isLevel, isScope, MODE_TITLE, ROUND_LENGTH, SCOPES, type FlagMode } from './common';
import s from './flags.module.css';

export function FlagQuiz() {
  const { mode } = useParams();
  const [params] = useSearchParams();
  if (mode !== 'guess' && mode !== 'find') return <Navigate to="/flag-spotter" replace />;
  const scope: Scope = isScope(params.get('region')) ? (params.get('region') as Scope) : 'world';
  const level: Level = isLevel(params.get('level')) ? (params.get('level') as Level) : 'medium';
  return <Round key={`${mode}-${scope}-${level}`} mode={mode} scope={scope} level={level} />;
}

function Round({ mode, scope, level }: { mode: FlagMode; scope: Scope; level: Level }) {
  const make = useCallback(() => buildRound(scope, ROUND_LENGTH, level, Math.random, FLAG_RULES), [scope, level]);
  const { quiz, question, pick, next, restart, answered, right, finished, bestBefore, newBest } = useQuizRound<Question>({
    make,
    kind: 'flags',
    roundKey: `flags:${mode}`,
    scope,
    level,
  });

  const scopeLabel = SCOPES.find((x) => x.id === scope)!.label;
  const levelLabel = LEVELS.find((l) => l.id === level)!.label;
  const missed = quiz.questions.filter((_, i) => quiz.results[i] === false).map((x) => x.answer);

  return (
    <div className={`page ${q.page}`}>
      <QuizTopBar
        backTo="/flag-spotter"
        backLabel="Back to Flag Spotter"
        caption={`Flag Spotter · ${scopeLabel} · ${levelLabel}`}
        title={MODE_TITLE[mode]}
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
                    {missed.map((c) => (
                      <li key={c.code}>
                        <Flag country={c} alt="" />
                        <span>{c.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            }
            links={
              <>
                <Link to="/flag-spotter" className={q.textLink}>
                  Change settings
                </Link>
                <Link to="/flag-spotter/album" className={q.textLink}>
                  Stamp album
                </Link>
              </>
            }
          />
        ) : (
          question && (
            <>
              <QuizProgress quiz={quiz} noun="Flag" />
              {mode === 'guess' ? <GuessBody quiz={quiz} onPick={pick} /> : <FindBody quiz={quiz} onPick={pick} />}
              <QuizFeedback
                quiz={quiz}
                answered={answered}
                right={right}
                wrongText={
                  <>
                    Not quite. That’s the flag of <b>{question.answer.name}</b>.
                  </>
                }
                onNext={next}
                nextLabel="Next flag →"
              />
            </>
          )
        )}
      </Frame>
      <QuizHint />
    </div>
  );
}

type Body = { quiz: QuizState<Question>; onPick: (code: string) => void };

const stateOf = (quiz: QuizState<Question>, option: Country) => {
  const qn = current(quiz)!;
  if (quiz.picked === null) return 'idle' as const;
  if (option.code === qn.answer.code) return 'correct' as const;
  if (option.code === quiz.picked) return 'wrong' as const;
  return 'muted' as const;
};

function GuessBody({ quiz, onPick }: Body) {
  const qn = current(quiz)!;
  return (
    <div className={s.guess}>
      <div className={s.bigStampWrap}>
        <span className={s.bigStamp} key={qn.answer.code}>
          <Flag country={qn.answer} alt="The flag to identify" eager />
        </span>
      </div>
      <div className={s.guessSide}>
        <h2 className={`brand-type ${s.question}`}>Whose flag is this?</h2>
        <div className={s.options}>
          {qn.options.map((o, i) => {
            const st = stateOf(quiz, o);
            return (
              <Ticket
                key={o.code}
                state={st}
                onClick={() => onPick(o.code)}
                disabled={quiz.picked !== null}
                trailing={st === 'correct' ? <CheckIcon size={20} /> : <KeyHint n={i + 1} />}
              >
                {o.name}
              </Ticket>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FindBody({ quiz, onPick }: Body) {
  const qn = current(quiz)!;
  const answered = quiz.picked !== null;
  return (
    <div className={s.find}>
      <div className={s.findPrompt}>
        <span className="caption">Which is the flag of</span>
        <span className={`brand-type ${s.findName}`} key={qn.answer.code}>
          {qn.answer.name}?
        </span>
      </div>
      <div className={s.flagOptions}>
        {qn.options.map((o, i) => {
          const st = stateOf(quiz, o);
          return (
            <button
              key={o.code}
              type="button"
              className={s.flagOption}
              data-state={st}
              onClick={() => onPick(o.code)}
              disabled={answered}
              aria-label={answered ? `${o.name}${st === 'correct' ? ', correct' : st === 'wrong' ? ', your answer' : ''}` : `Flag option ${i + 1}`}
            >
              <span className={s.optionStamp}>
                <Flag country={o} alt="" eager />
              </span>
              <span className={s.optionLabel}>{answered ? o.name : <KeyHint n={i + 1} />}</span>
              {st === 'correct' && (
                <span className={s.optionMark}>
                  <CheckIcon size={18} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
