import { ButtonLink, Frame } from '../../components/ui';
import { MapIcon } from '../../components/ui/Icons';
import s from './stub.module.css';

export function NotFound() {
  return (
    <div className="page">
      <Frame as="section" className={s.card} gap="var(--card)" aria-labelledby="nf-title">
        <span className={s.icon}>
          <MapIcon size={60} />
        </span>
        <p className="caption">Page not found</p>
        <h1 id="nf-title" className={`brand-type ${s.title}`}>
          Off the map
        </h1>
        <p className={s.blurb}>Here be dragons. This page doesn’t exist, but the rest of the world does.</p>
        <p className={`hand ${s.note}`}>try one of these instead…</p>
        <div className={s.links}>
          <ButtonLink to="/">Home</ButtonLink>
          <ButtonLink to="/map-hunt" variant="secondary">
            Map Hunt
          </ButtonLink>
          <ButtonLink to="/daily" variant="secondary">
            Today’s voyage
          </ButtonLink>
        </div>
      </Frame>
    </div>
  );
}
