import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { feature } from 'topojson-client';
import { COUNTRIES, countriesIn, getCountry, REGIONS } from './countries';

const root = path.resolve(__dirname, '../..');
const atlas = JSON.parse(fs.readFileSync(path.join(root, 'public/data/countries-50m.json'), 'utf8'));
const features = (feature(atlas, atlas.objects.countries) as unknown as { features: { id?: string; properties: { name: string } }[] }).features;
const featureKeys = new Set(features.flatMap((f) => [f.id, `name:${f.properties.name}`].filter(Boolean) as string[]));

describe('country dataset', () => {
  it('has the 193 UN members plus Vatican City, Palestine, Kosovo and Taiwan', () => {
    expect(COUNTRIES).toHaveLength(197);
    expect(COUNTRIES.filter((c) => c.unMember)).toHaveLength(193);
    for (const name of ['Vatican City', 'Palestine', 'Kosovo', 'Taiwan']) {
      expect(COUNTRIES.some((c) => c.name === name)).toBe(true);
    }
  });

  it('has unique codes and names', () => {
    for (const key of ['code', 'iso2', 'name'] as const) {
      expect(new Set(COUNTRIES.map((c) => c[key])).size).toBe(COUNTRIES.length);
    }
  });

  it('gives every country a capital, a continent, coordinates and a flag file', () => {
    for (const c of COUNTRIES) {
      expect(c.capitals.length, c.name).toBeGreaterThan(0);
      expect(c.continents.length, c.name).toBeGreaterThan(0);
      expect(c.latlng, c.name).toHaveLength(2);
      expect(fs.existsSync(path.join(root, 'public', c.flag)), `${c.name} flag`).toBe(true);
    }
  });

  it('can draw every country: a map shape, or a marker for tiny ones', () => {
    for (const c of COUNTRIES) {
      for (const id of c.featureIds) expect(featureKeys.has(id), `${c.name} → ${id}`).toBe(true);
      expect(c.featureIds.length > 0 || c.marker, c.name).toBe(true);
    }
  });

  it('never uses one map shape for two countries', () => {
    const owners = new Map<string, string>();
    for (const c of COUNTRIES) {
      for (const id of c.featureIds) {
        expect(owners.get(id), `${id} used by ${owners.get(id)} and ${c.name}`).toBeUndefined();
        owners.set(id, c.name);
      }
    }
  });

  it('splits the Americas and keeps Russia and Türkiye in Europe and Asia', () => {
    expect(getCountry('BRA')?.continents).toEqual(['south-america']);
    expect(getCountry('MEX')?.continents).toEqual(['north-america']);
    expect(getCountry('JAM')?.continents).toEqual(['north-america']);
    expect(getCountry('RUS')?.continents).toEqual(['europe', 'asia']);
    expect(getCountry('TUR')?.continents).toEqual(['europe', 'asia']);
    const total = REGIONS.reduce((n, r) => n + countriesIn(r.id).length, 0);
    expect(total).toBe(197 + 2); // the two transcontinental countries count twice
  });

  it('handles countries with special capital arrangements', () => {
    expect(getCountry('ZAF')?.capitals).toEqual(['Pretoria', 'Cape Town', 'Bloemfontein']);
    expect(getCountry('BOL')?.capitals).toEqual(['Sucre', 'La Paz']);
    expect(getCountry('LKA')?.capitals).toContain('Sri Jayawardenepura Kotte');
    expect(getCountry('SWZ')?.capitals).toEqual(['Mbabane', 'Lobamba']);
    expect(getCountry('NLD')?.notDistractor).toContain('The Hague');
    expect(getCountry('ISR')?.skipReverse).toBe(true);
    for (const c of COUNTRIES) if (c.capitals.length > 1) expect(c.capitalNote, c.name).toBeTruthy();
  });

  it('colours the map like an atlas: neighbours never share a colour', () => {
    expect(getCountry('FRA')?.neighbors).toEqual(expect.arrayContaining(['ESP', 'DEU', 'BEL', 'ITA']));
    expect(getCountry('BRA')!.neighbors.length).toBeGreaterThanOrEqual(10);
    for (const c of COUNTRIES) {
      expect(c.color, c.name).toBeGreaterThanOrEqual(0);
      for (const n of c.neighbors) {
        expect(getCountry(n)?.neighbors, `${n} ↔ ${c.code}`).toContain(c.code);
        expect(getCountry(n)?.color, `${c.name} and ${getCountry(n)?.name} share a colour`).not.toBe(c.color);
      }
    }
    // every colour gets used, roughly evenly
    const counts = new Map<number, number>();
    for (const c of COUNTRIES) counts.set(c.color, (counts.get(c.color) ?? 0) + 1);
    expect(counts.size).toBe(12);
    expect(Math.max(...counts.values()) - Math.min(...counts.values())).toBeLessThanOrEqual(3);
  });

  it('maps the unnamed Natural Earth shapes to the right countries', () => {
    expect(getCountry('UNK')?.featureIds).toEqual(['name:Kosovo']);
    expect(getCountry('SOM')?.featureIds).toContain('name:Somaliland');
    expect(getCountry('CYP')?.featureIds).toContain('name:N. Cyprus');
    expect(getCountry('TUV')?.marker).toBe(true);
  });
});
