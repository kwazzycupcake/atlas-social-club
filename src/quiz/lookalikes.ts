// Flags that look alike. Used to make Hard mode genuinely tricky, and to keep
// near-identical flags from ever appearing side by side as options.

/** Pairs so close that showing both would be pure guessing. Never shown together. */
export const NEAR_IDENTICAL: [string, string][] = [
  ['TCD', 'ROU'], // Chad / Romania: same tricolour, a slightly different blue
  ['IDN', 'MCO'], // Indonesia / Monaco: red over white, only the proportions differ
];

/** Families of similar flags: fair but hard distractors for each other. */
export const LOOKALIKE_GROUPS: string[][] = [
  ['IRL', 'CIV', 'ITA', 'MEX'], // vertical green-white-orange/red tricolours
  ['NLD', 'LUX', 'FRA', 'PRY', 'HRV'], // red-white-blue
  ['RUS', 'SVK', 'SVN', 'SRB'], // white-blue-red with or without a crest
  ['NOR', 'ISL', 'DNK', 'SWE', 'FIN'], // Nordic crosses
  ['AUS', 'NZL', 'FJI', 'TUV'], // Union Jack + stars
  ['SEN', 'MLI', 'GIN', 'CMR'], // green-yellow-red verticals
  ['COL', 'ECU', 'VEN'], // yellow-blue-red horizontals
  ['QAT', 'BHR'], // serrated white band
  ['HND', 'NIC', 'SLV', 'GTM', 'ARG'], // blue-white-blue
  ['EGY', 'SYR', 'IRQ', 'YEM'], // red-white-black horizontals
  ['JOR', 'PSE', 'SDN', 'KWT', 'ARE'], // pan-Arab colours with a triangle or bar
  ['POL', 'IDN', 'MCO'], // red and white halves
  ['HTI', 'LIE'], // blue over red
  ['KGZ', 'KAZ', 'TJK', 'UZB', 'TKM'], // Central Asia
  ['BOL', 'GHA', 'LTU', 'ETH'], // red-yellow-green stripes
  ['ROU', 'AND', 'MDA', 'TCD', 'BEL'], // blue-yellow-red verticals
  ['USA', 'LBR', 'MYS'], // stripes and stars
  ['CUB', 'CHL', 'CZE', 'PHL'], // triangle at the hoist
  ['TUR', 'TUN', 'AZE', 'PAK', 'MDV'], // crescent and star
  ['JPN', 'BGD', 'PLW'], // disc
];

const groupOf = new Map<string, Set<string>>();
for (const g of LOOKALIKE_GROUPS) for (const c of g) {
  const set = groupOf.get(c) ?? new Set<string>();
  for (const o of g) if (o !== c) set.add(o);
  groupOf.set(c, set);
}

export function lookalikesOf(code: string): string[] {
  return [...(groupOf.get(code) ?? [])];
}

export function tooSimilar(a: string, b: string): boolean {
  return NEAR_IDENTICAL.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
