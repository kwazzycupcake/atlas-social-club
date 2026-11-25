// How each region is framed on screen: projection + the lon/lat box to fit.
import { geoConicConformal, geoEqualEarth, type GeoProjection } from 'd3-geo';
import type { RegionId } from '../data/countries';

export type ViewId = RegionId | 'world';

interface ViewSpec {
  width: number;
  height: number;
  /** [west, south, east, north]; east may exceed 180 to cross the date line */
  box: [number, number, number, number];
  projection: () => GeoProjection;
}

const SPECS: Record<ViewId, ViewSpec> = {
  // Centred on 10°E so the map edge (the 170°W meridian) falls in open Pacific
  // water east of Samoa and Tonga. The box stops just short of that edge on
  // both sides: a corner exactly on the seam would be ambiguous.
  world: { width: 1000, height: 520, box: [-169, -56, 189, 83], projection: () => geoEqualEarth().rotate([-10, 0]) },
  africa: { width: 820, height: 820, box: [-26, -36, 58, 38], projection: () => geoEqualEarth().rotate([-16, 0]) },
  asia: { width: 1000, height: 700, box: [26, -11, 150, 56], projection: () => geoEqualEarth().rotate([-88, 0]) },
  europe: {
    width: 900,
    height: 680,
    box: [-25, 34, 45, 71],
    projection: () => geoConicConformal().rotate([-10, 0]).parallels([40, 62]),
  },
  'north-america': { width: 960, height: 720, box: [-170, 6, -52, 74], projection: () => geoEqualEarth().rotate([100, 0]) },
  'south-america': { width: 680, height: 820, box: [-92, -56, -30, 13], projection: () => geoEqualEarth().rotate([60, 0]) },
  oceania: { width: 1000, height: 640, box: [110, -48, 195, 12], projection: () => geoEqualEarth().rotate([-160, 0]) },
};

/** Points along the box edge so curved projections fit the whole box. */
function boxOutline([w, s, e, n]: ViewSpec['box']) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 16; i++) {
    const lon = w + ((e - w) * i) / 16;
    const lat = s + ((n - s) * i) / 16;
    pts.push([lon, s], [lon, n], [w, lat], [e, lat]);
  }
  return { type: 'MultiPoint' as const, coordinates: pts.map(([lon, lat]) => [lon > 180 ? lon - 360 : lon, lat]) };
}

export interface MapView {
  id: ViewId;
  width: number;
  height: number;
  projection: GeoProjection;
}

export function makeView(id: ViewId): MapView {
  const spec = SPECS[id];
  const projection = spec.projection().fitExtent(
    [
      [12, 12],
      [spec.width - 12, spec.height - 12],
    ],
    boxOutline(spec.box),
  );
  return { id, width: spec.width, height: spec.height, projection };
}
