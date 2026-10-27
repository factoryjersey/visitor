import { describe, expect, it } from 'vitest';
import { doFill, doSection, type DoProvider } from '@/lib/domain/do-section';

const box = (slug: string, side: 'water' | 'land', imageUrl = '') => ({ slug, name: slug, side, blurb: '', imageUrl, preview: imageUrl, guidePicture: false });
const p = (code: string, activities: string[]): DoProvider => ({ code, name: code, phone: '', website: '', activities });

describe('the Do section', () => {
  it('runs the water then land on together, each box with the markers of who offers it', () => {
    const s = doSection([box('golf', 'land'), box('surf', 'water'), box('sup', 'water')], [p('SSC', ['surf']), p('JSS', ['surf', 'sup']), p('RJ', ['golf'])], 'grid8');
    expect(s.pages.map((pg) => pg.sides)).toEqual([['water', 'land']]);
    expect(s.pages[0]!.cells.map((c) => c.slug)).toEqual(['surf', 'sup', 'golf']);
    expect(s.pages[0]!.cells.find((c) => c.slug === 'surf')!.codes).toEqual(['JSS', 'SSC']);
  });

  it('gives each page a picture beside its activity when one has a picture', () => {
    const s = doSection([box('surf', 'water', 'https://x/surf.jpg'), box('sup', 'water')], [], 'grid8');
    expect(s.pages[0]!.cells.map((c) => `${c.frame}:${c.slug}`)).toEqual(['listing:surf', 'image:surf', 'listing:sup']);
  });

  it('indexes only the providers offering an activity in this edition, by marker', () => {
    const s = doSection([box('surf', 'water')], [p('WM', ['kite', 'surf']), p('A', ['swim']), p('JSS', ['surf'])], 'grid8');
    expect(s.providers.map((x) => `${x.code}:${x.activities.join('+')}`)).toEqual(['JSS:surf', 'WM:surf']);
  });

  it('says how the activities fill their pages, a picture a page', () => {
    // Seven activities to a page of eight with its picture.
    expect(doFill(7, 'grid8')).toEqual({ pages: 1, empty: 0, add: 0, drop: 0 });
    expect(doFill(10, 'grid8')).toEqual({ pages: 2, empty: 4, add: 4, drop: 3 });
    expect(doFill(16, 'grid16')).toEqual({ pages: 2, empty: 14, add: 14, drop: 1 });
  });
});
