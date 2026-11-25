import { REGIONS } from '../../data/countries';
import type { ViewId } from '../../map/views';

export interface MapChoice {
  id: ViewId;
  label: string;
  short: string;
  /** card / tag colour */
  color: string;
  blurb: string;
}

export const MAP_CHOICES: MapChoice[] = [
  { id: 'world', label: 'The whole world', short: 'World', color: 'var(--paper-deep)', blurb: 'All 197 countries. The grand tour.' },
  ...REGIONS.map((r) => ({
    id: r.id as ViewId,
    label: r.label,
    short: r.short,
    color: r.color,
    blurb: {
      africa: 'Fifty-four countries, from Cabo Verde to the Comoros.',
      asia: 'The biggest continent, from Türkiye to Japan.',
      europe: 'Small countries packed tightly together. Mind the microstates.',
      'north-america': 'Canada to Panama, plus every Caribbean island nation.',
      'south-america': 'Twelve countries. A good place to start.',
      oceania: 'Australia, New Zealand and a scatter of Pacific islands.',
    }[r.id],
  })),
];

export const isMapChoice = (v: string | null | undefined): v is ViewId => MAP_CHOICES.some((c) => c.id === v);
export const choiceFor = (id: ViewId) => MAP_CHOICES.find((c) => c.id === id)!;
