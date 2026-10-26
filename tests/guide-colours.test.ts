import { describe, expect, it } from 'vitest';
import { SECTION_SWATCHES, sectionSwatch, tint, UNASSIGNED } from '@/lib/domain/guide-colours';

describe('sectionSwatch', () => {
  it('gives each section one colour, Visit teal for its tab and entries alike', () => {
    expect(sectionSwatch('Visit').hex).toBe('#78c9d2');
    expect(sectionSwatch('Buy').hex).toBe('#bb4983');
    expect(sectionSwatch('Do').hex).toBe('#4e69a9');
    expect(sectionSwatch('See').hex).toBe('#f5ce6f');
    expect(sectionSwatch('Eat')).toBe(SECTION_SWATCHES.Eat);
  });
  it('knows the sections by the other names staff give them', () => {
    expect(sectionSwatch('Eat & Drink: Pubs')).toBe(SECTION_SWATCHES.Eat);
    expect(sectionSwatch('Shopping')).toBe(SECTION_SWATCHES.Buy);
    expect(sectionSwatch(' attractions ')).toBe(SECTION_SWATCHES.Visit);
    expect(sectionSwatch('Do: water sports')).toBe(SECTION_SWATCHES.Do);
  });
  it('does not take a word that only starts like a section', () => {
    expect(sectionSwatch('Donkeys')).toBe(UNASSIGNED);
    expect(sectionSwatch('Stay')).toBe(UNASSIGNED);
  });
});

describe('tint', () => {
  it('mixes with paper as InDesign tints', () => {
    expect(tint('#bb4983', 100)).toBe('#bb4983');
    expect(tint('#000000', 20)).toBe('#cccccc');
    expect(tint('#bb4983', 20)).toBe('#f1dbe6');
  });
});
