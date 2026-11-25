// Map Hunt start screen: one card per map (World + 6 continents).
// Picking a card goes straight into a timed game.
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { geoPath } from 'd3-geo';
import { countriesIn, getCountry, REGIONS } from '../../data/countries';
import { loadShapes, type MapShape } from '../../map/geo';
import { makeView, type ViewId } from '../../map/views';
import { useProgress } from '../../progress/store';
import { formatDuration } from '../../lib/format';
import { ArrowIcon, BackIcon } from '../../components/ui/Icons';
import { isMapChoice, MAP_CHOICES } from './regions';
import s from './picker.module.css';

const COLOR_BY_REGION = Object.fromEntries(REGIONS.map((r) => [r.id, r.color]));

export function MapHuntPicker() {
  const [params] = useSearchParams();
  const [shapes, setShapes] = useState<MapShape[] | null>(null);
  useEffect(() => {
    loadShapes('110m').then(setShapes, () => setShapes([])); // previews are decorative; fail quietly
  }, []);
  const progress = useProgress();

  // Old links: /map-hunt?region=europe and the homepage dare /map-hunt?find=KHM
  const legacyRegion = params.get('region');
  const find = params.get('find');
  if (isMapChoice(legacyRegion) || find) {
    const to = `/map-hunt/${isMapChoice(legacyRegion) ? legacyRegion : 'world'}${find ? `?find=${find}` : ''}`;
    return <Navigate to={to} replace />;
  }

  return (
    <div className="page">
      <div className={s.head}>
        <Link to="/" className={s.back} aria-label="Back to home">
          <BackIcon size={18} />
        </Link>
        <div>
          <h1 className={`brand-type ${s.title}`}>Map Hunt</h1>
          <p className={s.sub}>
            Pick a map. The clock starts the moment you do<span className="hand"> (no pressure)</span>.
          </p>
        </div>
      </div>

      <ul className={s.grid}>
        {MAP_CHOICES.map((choice) => {
          const codes = countriesIn(choice.id).map((c) => c.code);
          const found = codes.filter((c) => progress.found[c]).length;
          const best = progress.bestTimes[choice.id];
          return (
            <li key={choice.id} className={choice.id === 'world' ? s.wide : undefined}>
              <Link to={`/map-hunt/${choice.id}`} className={s.card} style={{ ['--tint' as string]: choice.color }}>
                <div className={s.preview}>
                  <MiniMap id={choice.id} shapes={shapes} />
                </div>
                <div className={s.body}>
                  <div className={s.nameRow}>
                    <h2 className={`brand-type ${s.name}`}>{choice.label}</h2>
                    <span className={s.go} aria-hidden="true">
                      <ArrowIcon size={20} />
                    </span>
                  </div>
                  <p className={s.blurb}>{choice.blurb}</p>
                  <div className={s.meta}>
                    <span className="num">{codes.length} countries</span>
                    <span className="num">{best !== undefined ? `Best ${formatDuration(best)}` : 'No best time yet'}</span>
                  </div>
                  <div
                    className={s.bar}
                    role="progressbar"
                    aria-label={`${found} of ${codes.length} found`}
                    aria-valuemin={0}
                    aria-valuemax={codes.length}
                    aria-valuenow={found}
                  >
                    <div style={{ width: `${(found / codes.length) * 100}%` }} />
                  </div>
                  <span className={`num ${s.found}`}>
                    {found} / {codes.length} found
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MiniMap({ id, shapes }: { id: ViewId; shapes: MapShape[] | null }) {
  const view = useMemo(() => makeView(id), [id]);
  const paths = useMemo(() => {
    if (!shapes) return [];
    const playable = new Set(countriesIn(id).map((c) => c.code));
    const path = geoPath(view.projection).digits(1);
    return shapes
      .map((sh) => {
        const d = path(sh.feature);
        if (!d) return null;
        const inRegion = sh.code !== null && playable.has(sh.code);
        const c = sh.code ? getCountry(sh.code) : undefined;
        const region = sh.code === 'RUS' ? 'asia' : c?.continents[0];
        const fill = inRegion ? (id === 'world' ? COLOR_BY_REGION[region!] : `var(--tint)`) : undefined;
        return { key: sh.uid, d, fill, inRegion };
      })
      .filter(Boolean) as { key: string; d: string; fill?: string; inRegion: boolean }[];
  }, [shapes, id, view]);

  return (
    <svg viewBox={`0 0 ${view.width} ${view.height}`} className={s.mini} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width={view.width} height={view.height} className={s.miniSea} />
      {paths.map((p) => (
        <path key={p.key} d={p.d} className={p.inRegion ? s.miniLand : s.miniDim} style={p.fill ? { fill: p.fill } : undefined} />
      ))}
    </svg>
  );
}
