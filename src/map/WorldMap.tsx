// Interactive SVG world map: every game country is its own clickable shape;
// tiny countries also get a tap marker. Zoom with pinch, ctrl/⌘+scroll or the
// buttons; drag to pan. Plain scrolling still scrolls the page.
import {
  forwardRef,
  memo,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { geoPath, type GeoPath } from 'd3-geo';
import type { Polygon } from 'geojson';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { getCountry } from '../data/countries';
import type { MapShape, ShapeFeature } from './geo';
import type { MapView } from './views';
import decorByView from './decor.json';
import s from './worldmap.module.css';

/** How a playable country is drawn right now. */
export type Look = 'idle' | 'found' | 'just-found' | 'wrong' | 'revealed';

export interface WorldMapHandle {
  zoomTo(code: string): void;
  reset(): void;
  zoomBy(factor: number): void;
}

interface Props {
  view: MapView;
  shapes: MapShape[];
  /** codes that can be picked in this view; everything else is drawn dim */
  playable: ReadonlySet<string>;
  looks: ReadonlyMap<string, Look>;
  /** fill for found countries */
  colorOf: (code: string) => string;
  onPick?: (code: string) => void;
  onHover?: (code: string | null) => void;
  label: string;
  /** watercolour washes, waves, boats, a whale and clouds in the sea (default on) */
  decor?: boolean;
}

/** Shapes smaller than this (in view units²) also get a tap marker. */
const TINY_AREA = 40;

type Bounds = [[number, number], [number, number]];

/** The largest polygon of a (multi)polygon that is at least partly on screen. */
function largestPiece(f: ShapeFeature, path: GeoPath, W: number, H: number): { area: number; bounds: Bounds; poly: Polygon } | null {
  const g = f.geometry;
  const polys: Polygon[] =
    g.type === 'Polygon' ? [g] : g.type === 'MultiPolygon' ? g.coordinates.map((coordinates) => ({ type: 'Polygon', coordinates })) : [];
  let best: { area: number; bounds: Bounds; poly: Polygon } | null = null;
  for (const poly of polys) {
    const b = path.bounds(poly) as Bounds;
    if (!Number.isFinite(b[0][0]) || b[1][0] < 0 || b[0][0] > W || b[1][1] < 0 || b[0][1] > H) continue;
    const area = path.area(poly);
    if (!best || area > best.area) best = { area, bounds: b, poly };
  }
  return best;
}

/** Where a country's name goes, and how much room it has (view units). */
interface Anchor {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DrawnShape {
  key: string;
  code: string | null;
  d: string;
}

export const WorldMap = forwardRef<WorldMapHandle, Props>(function WorldMap(
  { view, shapes, playable, looks, colorOf, onPick, onHover, label, decor = true },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [k, setK] = useState(1);
  const { width: W, height: H } = view;

  // Project every shape once per view.
  const { drawn, boundsByCode, markers, anchors } = useMemo(() => {
    const path = geoPath(view.projection).digits(1);
    const drawn: DrawnShape[] = [];
    const boundsByCode = new Map<string, [[number, number], [number, number]]>();
    const areaByCode = new Map<string, number>();
    const anchors = new Map<string, Anchor>();
    for (const sh of shapes) {
      const b = path.bounds(sh.feature);
      // Generous margins: on a wide screen the map shows well beyond its frame,
      // so neighbouring land fills the edges instead of empty sea.
      const mx = W * 0.75, my = H * 0.35;
      if (!Number.isFinite(b[0][0]) || b[1][0] < -mx || b[0][0] > W + mx || b[1][1] < -my || b[0][1] > H + my) continue;
      const d = path(sh.feature);
      if (!d) continue;
      drawn.push({ key: sh.uid, code: sh.code, d });
      if (sh.code) {
        // Zoom targets use the biggest piece on screen, so France zooms to
        // mainland France rather than halfway to French Guiana.
        const main = largestPiece(sh.feature, path, W, H);
        if (main && main.area > (areaByCode.get(sh.code) ?? -1)) {
          areaByCode.set(sh.code, main.area);
          boundsByCode.set(sh.code, main.bounds);
          const [x, y] = path.centroid(main.poly);
          const [[x0, y0], [x1, y1]] = main.bounds;
          if (Number.isFinite(x)) anchors.set(sh.code, { x, y, w: x1 - x0, h: y1 - y0 });
        }
      }
    }
    const markers: Marker[] = [];
    for (const code of playable) {
      const c = getCountry(code);
      if (!c) continue;
      if (!c.marker && (areaByCode.get(code) ?? 0) >= TINY_AREA) continue;
      const p = view.projection([c.latlng[1], c.latlng[0]]);
      if (p && p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= H) {
        // islands flagged in the data always keep a dot; other small countries
        // only need one until zooming in makes their shape big enough to tap
        markers.push({ code, x: p[0], y: p[1], area: c.marker ? null : areaByCode.get(code) ?? 0 });
        if (!boundsByCode.has(code)) boundsByCode.set(code, [[p[0] - 2, p[1] - 2], [p[0] + 2, p[1] + 2]]);
        // tiny countries are labelled at their marker
        anchors.set(code, { x: p[0], y: p[1], w: 0, h: 0 });
      }
    }
    return { drawn, boundsByCode, markers, anchors };
  }, [shapes, view, playable, W, H]);

  // Zoom + pan.
  useEffect(() => {
    const svg = select(svgRef.current!);
    let raf = 0;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 24])
      .extent([
        [0, 0],
        [W, H],
      ])
      .translateExtent([
        [0, 0],
        [W, H],
      ])
      .clickDistance(8)
      .filter((event: Event & { ctrlKey?: boolean; metaKey?: boolean; button?: number }) => {
        if (event.type === 'wheel') return Boolean(event.ctrlKey || event.metaKey); // let normal scrolling scroll the page
        return !event.button;
      })
      .on('zoom', (e) => {
        gRef.current?.setAttribute('transform', e.transform.toString());
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => setK(e.transform.k));
      });
    svg.call(z).on('dblclick.zoom', null);
    zoomRef.current = z;
    return () => {
      cancelAnimationFrame(raf);
      svg.on('.zoom', null);
      svg.interrupt();
    };
  }, [W, H]);

  // A new view starts zoomed out.
  useEffect(() => {
    if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);
  }, [view]);

  useImperativeHandle(
    ref,
    () => ({
      zoomTo(code) {
        const b = boundsByCode.get(code);
        if (!b || !svgRef.current || !zoomRef.current) return;
        const [[x0, y0], [x1, y1]] = b;
        const scale = Math.min(10, Math.max(1, 0.45 / Math.max((x1 - x0) / W, (y1 - y0) / H)));
        const t = zoomIdentity
          .translate(W / 2, H / 2)
          .scale(scale)
          .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
        select(svgRef.current).transition().duration(650).call(zoomRef.current.transform, t);
      },
      reset() {
        if (svgRef.current && zoomRef.current) select(svgRef.current).transition().duration(450).call(zoomRef.current.transform, zoomIdentity);
      },
      zoomBy(factor) {
        if (svgRef.current && zoomRef.current) select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, factor);
      },
    }),
    [boundsByCode, W, H],
  );

  const codeFrom = (target: EventTarget | null) =>
    (target instanceof Element ? target.closest<SVGElement>('[data-code]')?.dataset.code : undefined) ?? null;

  const handleClick = (e: MouseEvent<SVGGElement>) => {
    const code = codeFrom(e.target);
    if (code && playable.has(code)) onPick?.(code);
  };
  const handleOver = (e: PointerEvent<SVGGElement>) => {
    const code = codeFrom(e.target);
    onHover?.(code && playable.has(code) ? code : null);
  };

  /* ---- keyboard play: arrows move between countries, Enter picks ---- */
  const [focus, setFocus] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const handleKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!onPick) return;
    const dirs: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    if (e.key in dirs) {
      e.preventDefault();
      const next = nextCountry(focus, dirs[e.key], anchors, playable, W, H);
      if (next) {
        setFocus(next);
        setAnnounce('Country highlighted. Press Enter to choose it.');
      }
    } else if ((e.key === 'Enter' || e.key === ' ') && focus) {
      e.preventDefault();
      onPick(focus);
    } else if (e.key === 'Escape') setFocus(null);
  };

  return (
    <svg
      ref={svgRef}
      className={onPick ? s.map : `${s.map} ${s.viewOnly}`}
      viewBox={`0 0 ${W} ${H}`}
      role={onPick ? 'application' : 'img'}
      aria-label={onPick ? `${label} Use the arrow keys to move between countries and Enter to choose.` : label}
      aria-roledescription={onPick ? 'map' : undefined}
      tabIndex={onPick ? 0 : undefined}
      onKeyDown={handleKey}
      onBlur={() => setFocus(null)}
      data-view={view.id}
    >
      <rect className={s.sea} x={-W} y={-H} width={W * 3} height={H * 3} />
      <g ref={gRef} onClick={handleClick} onPointerOver={handleOver} onPointerLeave={() => onHover?.(null)}>
        {decor && <SeaDecor view={view} k={k} />}
        {/* Halos sit under the shapes: they widen taps in open water (islands)
            without stealing taps from neighbouring countries. */}
        <Markers layer="halo" markers={markers} looks={looks} colorOf={colorOf} k={k} />
        <Shapes drawn={drawn} playable={playable} looks={looks} colorOf={colorOf} />
        <Markers layer="dot" markers={markers} looks={looks} colorOf={colorOf} k={k} />
        <Labels anchors={anchors} looks={looks} colorOf={colorOf} k={k} />
        {focus && <FocusRing code={focus} drawn={drawn} anchor={anchors.get(focus)} k={k} />}
      </g>
      <foreignObject width="1" height="1" className={s.srOnly}>
        <p aria-live="polite">{announce}</p>
      </foreignObject>
    </svg>
  );
});

type DecorSpec = {
  boats: number[][];
  whales: number[][];
  clouds: number[][];
  waves: number[][];
  washes: (number | string)[][];
};

/** Soft watercolour sea: colour washes, waves, boats, a whale and clouds. */
const SeaDecor = memo(function SeaDecor({ view, k }: { view: MapView; k: number }) {
  const id = useId().replace(/:/g, '');
  const spec = (decorByView as Record<string, DecorSpec>)[view.id];
  if (!spec) return null;
  // decorations scale with the view (a little smaller on the busy world map)
  const u = (view.width / 1000) * (view.id === 'world' ? 0.7 : 1);
  const at = (lon: number, lat: number) => view.projection([lon > 180 ? lon - 360 : lon, lat]);
  const place = (lon: number, lat: number, scale = 1) => {
    const p = at(lon, lat);
    // boats, the whale, clouds and waves keep their on-screen size when you zoom
    // in, like map icons, instead of swelling over the countries
    return p ? `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)}) scale(${((u * scale) / k).toFixed(4)})` : undefined;
  };
  return (
    <g className={s.decor} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}deep`}>
          <stop offset="0" stopColor="var(--game-wash-deep)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--game-wash-deep)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}light`}>
          <stop offset="0" stopColor="var(--game-wash-light)" stopOpacity="0.95" />
          <stop offset="1" stopColor="var(--game-wash-light)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {spec.washes.map(([lon, lat, tone], i) => {
        const p = at(Number(lon), Number(lat));
        return p ? <ellipse key={`w${i}`} cx={p[0]} cy={p[1]} rx={230 * u} ry={150 * u} fill={`url(#${id}${tone})`} /> : null;
      })}
      {spec.waves.map(([lon, lat], i) => (
        <path key={`v${i}`} transform={place(lon, lat)} className={s.decorWave} d="M-21 0q7-7 14 0t14 0 14 0M-14 8q7-7 14 0t14 0" />
      ))}
      {spec.clouds.map(([lon, lat, sc], i) => (
        <path key={`c${i}`} transform={place(lon, lat, sc)} className={s.decorCloud} d="M-36 10c-14 0-16-18-2-20 2-14 22-18 30-6 8-10 26-6 26 8 14 0 16 18 2 18z" />
      ))}
      {spec.boats.map(([lon, lat], i) => (
        <g key={`b${i}`} transform={place(lon, lat)}>
          <path className={`${s.boatHull} ${s.boatLine}`} d="M-22 6H22L15 16H-15Z" />
          <path className={`${s.boatSail} ${s.boatLine}`} d="M0 6V-30L18 2Z" />
          <path className={`${s.boatFlag} ${s.boatLine}`} d="M-2-26L-16 2H-2Z" />
          <path className={s.decorWave} d="M-26 22q6-5 12 0t12 0 12 0 12 0" />
        </g>
      ))}
      {spec.whales.map(([lon, lat], i) => (
        <g key={`h${i}`} transform={place(lon, lat)}>
          <path className={s.whale} d="M-34 4C-34-16 6-20 26-6 32-2 36 0 40-4L48-16 46 2 52 10 38 6C26 18-6 22-22 16-30 13-34 9-34 4Z" />
          <circle className={s.whaleEye} cx={-20} cy={-2} r={2} />
          <path className={s.decorWave} d="M-12-20c-3-8 3-12 5-6M-7-26c4-6 10-2 6 4M-40 24q6-5 12 0t12 0 12 0 12 0 12 0" />
        </g>
      ))}
    </g>
  );
});

/**
 * Next country in an arrow-key direction: the nearest one whose anchor lies
 * that way, favouring countries straight ahead over ones off to the side.
 * With nothing focused yet, starts from the middle of the map.
 */
function nextCountry(
  from: string | null,
  [dx, dy]: [number, number],
  anchors: Map<string, Anchor>,
  playable: ReadonlySet<string>,
  W: number,
  H: number,
): string | null {
  const origin = (from && anchors.get(from)) || { x: W / 2, y: H / 2 };
  let best: string | null = null;
  let bestScore = Infinity;
  for (const [code, a] of anchors) {
    if (code === from || !playable.has(code)) continue;
    if (a.x < 0 || a.x > W || a.y < 0 || a.y > H) continue;
    const vx = a.x - origin.x;
    const vy = a.y - origin.y;
    const ahead = vx * dx + vy * dy; // distance in the arrow's direction
    if (from ? ahead <= 1 : false) continue;
    const side = Math.abs(vx * dy - vy * dx); // distance off to the side
    const score = from ? ahead + side * 2.2 : Math.hypot(vx, vy);
    if (score < bestScore) {
      bestScore = score;
      best = code;
    }
  }
  return best;
}

/** Dashed coral outline on the keyboard-highlighted country. */
function FocusRing({ code, drawn, anchor, k }: { code: string; drawn: DrawnShape[]; anchor?: Anchor; k: number }) {
  const paths = drawn.filter((d) => d.code === code);
  return (
    <g className={s.focusRing} aria-hidden="true">
      {paths.map((p) => (
        <path key={p.key} d={p.d} />
      ))}
      {anchor && (paths.length === 0 || anchor.w * k < 12) && <circle cx={anchor.x} cy={anchor.y} r={11 / k} />}
    </g>
  );
}

/** Approximate rendered width of a label (Figtree bold) in screen px. */
// rough width of a name in the label serif (Fraunces, slightly spaced)
const textWidth = (name: string, size: number) => name.length * size * 0.6;

/**
 * Names on found countries. Labels stay the same size on screen at any zoom
 * and only appear where they fit inside the country; the country just found
 * always gets a pinned tag. Labels never catch taps.
 */
const Labels = memo(function Labels({
  anchors,
  looks,
  colorOf,
  k,
}: {
  anchors: Map<string, Anchor>;
  looks: ReadonlyMap<string, Look>;
  colorOf: (code: string) => string;
  k: number;
}) {
  const items: JSX.Element[] = [];
  let tag: JSX.Element | null = null;
  for (const [code, look] of looks) {
    if (look !== 'found' && look !== 'just-found') continue;
    const a = anchors.get(code);
    const name = getCountry(code)?.name;
    if (!a || !name) continue;
    if (look === 'just-found') {
      const w = textWidth(name, 18) + 26;
      tag = (
        <g key={`tag-${code}`} transform={`translate(${a.x} ${a.y}) scale(${1 / k})`} className={s.tagLayer}>
          <g className={s.tagPop}>
            <path d="M0 0 L0 -18" className={s.tagString} />
            <circle r={3.5} className={s.tagPin} />
            <rect x={-w / 2} y={-54} width={w} height={36} rx={11} className={s.tagBox} style={{ fill: colorOf(code) }} />
            <text y={-30} className={s.tagText}>
              {name}
            </text>
          </g>
        </g>
      );
      continue;
    }
    // bigger countries get bigger names, like a printed atlas; only label where
    // the name fits comfortably inside the country
    const span = a.w * k;
    const size = span > 240 ? 17 : span > 120 ? 14.5 : 12.5;
    const fits = span >= textWidth(name, size) + 10 && a.h * k >= size + 6;
    if (!fits) continue;
    items.push(
      <text key={code} transform={`translate(${a.x} ${a.y}) scale(${1 / k})`} className={s.label} dy="0.35em" style={{ fontSize: size }}>
        {name}
      </text>,
    );
  }
  return (
    <g className={s.labels} aria-hidden="true">
      {items}
      {tag}
    </g>
  );
});

const Shapes = memo(function Shapes({
  drawn,
  playable,
  looks,
  colorOf,
}: {
  drawn: DrawnShape[];
  playable: ReadonlySet<string>;
  looks: ReadonlyMap<string, Look>;
  colorOf: (code: string) => string;
}) {
  // Draw dim shapes first so playable borders sit on top.
  const ordered = useMemo(
    () => [...drawn].sort((a, b) => Number(a.code !== null && playable.has(a.code)) - Number(b.code !== null && playable.has(b.code))),
    [drawn, playable],
  );
  return (
    <>
      {ordered.map((sh) => {
        const active = sh.code !== null && playable.has(sh.code);
        const look = active ? looks.get(sh.code!) ?? 'idle' : 'dim';
        const fill = look === 'found' || look === 'just-found' ? colorOf(sh.code!) : undefined;
        return (
          <path
            key={sh.key}
            d={sh.d}
            className={s.shape}
            data-look={look}
            data-code={active ? sh.code! : undefined}
            style={fill ? { fill } : undefined}
          />
        );
      })}
    </>
  );
});

interface Marker {
  code: string;
  x: number;
  y: number;
  /** shape area in view units² at zoom 1; null = always show a dot */
  area: number | null;
}

const Markers = memo(function Markers({
  layer,
  markers,
  looks,
  colorOf,
  k,
}: {
  layer: 'halo' | 'dot';
  markers: Marker[];
  looks: ReadonlyMap<string, Look>;
  colorOf: (code: string) => string;
  k: number;
}) {
  // Markers keep a constant on-screen size whatever the zoom.
  const r = (layer === 'halo' ? 14 : 6) / k;
  return (
    <>
      {markers.map((m) => {
        // zoomed in far enough that the country itself is easy to tap: no dot
        if (m.area !== null && m.area * k * k >= TINY_AREA) return null;
        const look = looks.get(m.code) ?? 'idle';
        const fill = look === 'found' || look === 'just-found' ? colorOf(m.code) : undefined;
        return (
          <g key={m.code} className={s.marker} data-code={m.code} data-look={look} data-layer={layer}>
            <circle
              cx={m.x}
              cy={m.y}
              r={r}
              className={layer === 'halo' ? s.markerHit : s.markerDot}
              style={fill && layer === 'dot' ? { fill } : undefined}
            />
          </g>
        );
      })}
    </>
  );
});
