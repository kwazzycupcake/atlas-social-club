// Covers the map while a timed game is paused, so nobody can study it for free.
import { Button } from './index';
import s from './paused.module.css';

export function PausedCard({ onResume }: { onResume: () => void }) {
  return (
    <div className={s.veil} role="dialog" aria-modal="false" aria-labelledby="paused-title">
      <div className={s.card}>
        <p className="hand">tea break?</p>
        <h2 id="paused-title" className={`brand-type ${s.title}`}>
          Paused
        </h2>
        <p className={s.text}>The clock stops while you’re away. Your time and progress are safe.</p>
        <Button onClick={onResume} autoFocus>
          Carry on
        </Button>
      </div>
    </div>
  );
}
