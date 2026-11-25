// Runs a multiple-choice round: answers, sounds, saved progress (including the
// best round per mode), auto-advance after a right answer, and keys 1–4 / Enter.
import { useCallback, useEffect, useReducer, useRef, useState, type Reducer } from 'react';
import { getProgress, recordAnswer, recordRound, type RoundRecord } from '../progress/store';
import { sounds } from '../lib/sound';
import { current, isFinished, newQuiz, quizReducer, type QuestionLike, type QuizAction, type QuizState } from './engine';

const NEXT_AFTER_CORRECT_MS = 550; // a beat to see the green tick, then straight on

export function useQuizRound<Q extends QuestionLike>({
  make,
  kind,
  roundKey,
  scope,
  level,
}: {
  /** builds a fresh set of questions */
  make: () => Q[];
  /** which "worth another look" list a wrong answer goes on */
  kind: 'flags' | 'capitals';
  /** where the best round is saved, e.g. "flags:guess" */
  roundKey: string;
  scope: string;
  level: string;
}) {
  const [quiz, dispatch] = useReducer(quizReducer as Reducer<QuizState<Q>, QuizAction<Q>>, undefined, () => newQuiz(make()));
  // best round when this one started, and whether this one beat it
  const [bestBefore, setBestBefore] = useState<RoundRecord | undefined>(() => getProgress().bestRounds[roundKey]);
  const [newBest, setNewBest] = useState(false);
  const saved = useRef(false);

  const q = current(quiz);
  const answered = quiz.picked !== null;
  const right = answered && quiz.picked === q?.answer.code;
  const finished = isFinished(quiz);

  const pick = useCallback(
    (code: string) => {
      if (!q || quiz.picked !== null) return;
      const correct = code === q.answer.code;
      dispatch({ type: 'pick', code });
      recordAnswer(kind, q.answer.code, correct);
      if (correct) sounds.correct(quiz.streak + 1 >= 3);
      else sounds.wrong();
    },
    [q, quiz.picked, quiz.streak, kind],
  );
  const next = useCallback(() => dispatch({ type: 'next' }), []);
  const restart = useCallback(() => {
    setBestBefore(getProgress().bestRounds[roundKey]);
    setNewBest(false);
    saved.current = false;
    dispatch({ type: 'reset', questions: make() });
  }, [make, roundKey]);

  // Right answers move on by themselves; wrong ones wait so you can look.
  useEffect(() => {
    if (!right) return;
    const t = setTimeout(next, NEXT_AFTER_CORRECT_MS);
    return () => clearTimeout(t);
  }, [right, quiz.index, next]);

  // save the finished round once
  useEffect(() => {
    if (!finished || saved.current) return;
    saved.current = true;
    sounds.finish();
    const correct = quiz.results.filter(Boolean).length;
    setNewBest(recordRound(roundKey, { correct, total: quiz.questions.length, scope, level, at: Date.now() }));
  }, [finished, quiz.results, quiz.questions.length, roundKey, scope, level]);

  // Keyboard: 1–4 answer, Enter / N for the next question after a miss.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !q) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) {
        if (e.key === 'Enter') return; // let a focused button handle its own Enter
      }
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length && !answered) pick(q.options[n - 1].code);
      if ((e.key === 'Enter' || e.key === 'n') && answered && !right) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, answered, right, pick, next]);

  return { quiz, question: q, pick, next, restart, answered, right, finished, bestBefore, newBest };
}
