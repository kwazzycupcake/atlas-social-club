import { useEffect } from 'react';
import { Link, Outlet, useLocation, useMatches, useNavigation } from 'react-router';
import type { TitleFn } from '../../App';
import { liveStreak, useProgress } from '../../progress/store';
import { Chip } from '../ui';
import { FlameIcon } from '../ui/Icons';
import { LogoMark } from './Logo';
import s from './layout.module.css';

// No game navigation in the header for now: the line-up of games is still
// growing, so games are reached from the homepage cards.
function SiteHeader() {
  const progress = useProgress();
  return (
    <header className={s.headerBand}>
      <div className={`page ${s.header}`}>
        <Link to="/" className={s.brand} aria-label="Atlas Social Club, home">
          <LogoMark size={52} />
          <span className={`brand-type ${s.brandName}`}>Atlas Social Club</span>
        </Link>
        <div className={s.stats}>
          <Chip label={`${liveStreak(progress)} day streak`}>
            <FlameIcon size={18} />
            <span className="num">{liveStreak(progress)}</span>
          </Chip>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className={s.footerBand}>
      <div className={`page ${s.footer}`}>
        <span>Atlas Social Club · no sign-up, just play. Progress stays on this device.</span>
        <span>
          Borders: <a href="https://www.naturalearthdata.com/">Natural Earth</a> · Flags:{' '}
          <a href="https://github.com/lipis/flag-icons">flag-icons</a> · Country data:{' '}
          <a href="https://github.com/mledoze/countries">mledoze/countries</a>
        </span>
      </div>
    </footer>
  );
}

/** Sets the browser-tab title from the matched route's `handle.title`. */
function useRouteTitle() {
  const matches = useMatches();
  useEffect(() => {
    const m = [...matches].reverse().find((x) => (x.handle as { title?: TitleFn } | undefined)?.title);
    const t = (m?.handle as { title: TitleFn } | undefined)?.title(m!.params);
    if (!t) return;
    document.title = t.startsWith('Atlas Social Club') ? t : `${t} · Atlas Social Club`;
  }, [matches]);
}

export function Layout() {
  const { pathname } = useLocation();
  const navigation = useNavigation();
  const matches = useMatches();
  const immersive = matches.some((m) => (m.handle as { immersive?: boolean } | undefined)?.immersive);
  useRouteTitle();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>
      {/* thin bar while a game's code is downloading */}
      {navigation.state === 'loading' && <div className={s.loadingBar} role="progressbar" aria-label="Loading" />}
      {immersive ? <div className={s.immersiveTop} /> : <SiteHeader />}
      <main id="main">
        {/* keyed by path so each page gently fades in */}
        <div key={pathname} className={s.pageIn}>
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
