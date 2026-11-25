// "Play with friends" is on its way: a teaser on the homepage that opens a
// coming-soon card explaining how it will work.
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui';
import s from './friends.module.css';

const FRIENDS = [
  { initial: 'P', color: 'var(--mint)' },
  { initial: 'S', color: 'var(--blush)' },
  { initial: 'A', color: 'var(--periwinkle)' },
  { initial: 'M', color: 'var(--butter)' },
];

function Avatars() {
  return (
    <span className={s.avatars} aria-hidden="true">
      {FRIENDS.map((f) => (
        <span key={f.initial} className={s.avatar} style={{ background: f.color }}>
          {f.initial}
        </span>
      ))}
      <span className={`${s.avatar} ${s.more}`}>+</span>
    </span>
  );
}

export function FriendsTeaser() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={s.teaser}>
        <Avatars />
        <div className={s.teaserText}>
          <h3 className={`display ${s.teaserTitle}`}>
            Play with friends <span className={`caption ${s.soon}`}>Coming soon</span>
          </h3>
          <p>Share a code and race up to 8 friends on the same countries, flags or capitals.</p>
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Take a peek
        </Button>
      </div>
      {open && <ComingSoon onClose={() => setOpen(false)} />}
    </>
  );
}

function ComingSoon({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  // No clean-up close(): removing the element closes it (see FlagAlbum).
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby="friends-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
    >
      <div className={s.dialogBody}>
        <Avatars />
        <p className={`hand ${s.note}`}>coming soon!</p>
        <h2 id="friends-title" className={`brand-type ${s.dialogTitle}`}>
          Play with friends
        </h2>
        <p className={s.lede}>We’re still building this one. Here’s how it will work:</p>
        <ol className={s.steps}>
          <li>
            <b>Make a room</b> and share its code with up to 7 friends.
          </li>
          <li>
            <b>Pick a game:</b> Map Hunt, Flags or Capitals. Everyone gets the same 15, in the same order.
          </li>
          <li>
            <b>Race!</b> Most right wins, and the fastest breaks a tie.
          </li>
        </ol>
        <Button onClick={() => ref.current?.close()} autoFocus>
          Can’t wait
        </Button>
      </div>
    </dialog>
  );
}
