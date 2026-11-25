// Loads Natural Earth country shapes and links each one to a game country.
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import { COUNTRIES } from '../data/countries';
import { asset } from '../lib/asset';

export type ShapeFeature = Feature<Geometry, { name: string }>;

export interface MapShape {
  /** unique per shape (a few shapes share an ISO id, e.g. Australia's Indian Ocean Territories) */
  uid: string;
  /** ISO numeric id, or `name:<Natural Earth name>` for shapes without one */
  key: string;
  /** game country code, or null for territories not in the game (Greenland, W. Sahara…) */
  code: string | null;
  feature: ShapeFeature;
}

const codeByKey = new Map<string, string>();
for (const c of COUNTRIES) for (const k of c.featureIds) codeByKey.set(k, c.code);

export function shapesFromTopology(topo: Topology): MapShape[] {
  const fc = feature(topo, topo.objects.countries as GeometryCollection<{ name: string }>);
  return fc.features
    .filter((f) => f.id !== '010') // Antarctica is never part of the game
    .map((f, i) => {
      const key = f.id ? String(f.id) : `name:${f.properties.name}`;
      const byName = `name:${f.properties.name}`;
      return { uid: `${key}#${i}`, key, code: codeByKey.get(key) ?? codeByKey.get(byName) ?? null, feature: f as ShapeFeature };
    });
}

const cache = new Map<string, Promise<MapShape[]>>();

/**
 * Fetches world shapes once per visit: 1:50m for the game (accurate borders),
 * 1:110m for small previews (a seventh of the size).
 */
export function loadShapes(resolution: '50m' | '110m' = '50m'): Promise<MapShape[]> {
  let p = cache.get(resolution);
  if (!p) {
    p = fetch(asset(`data/countries-${resolution}.json`))
      .then((r) => {
        if (!r.ok) throw new Error(`Map data failed to load (${r.status})`);
        return r.json() as Promise<Topology>;
      })
      .then(shapesFromTopology)
      .catch((e) => {
        cache.delete(resolution); // allow a retry
        throw e;
      });
    cache.set(resolution, p);
  }
  return p;
}
