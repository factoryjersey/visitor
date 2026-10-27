import { describe, expect, it } from 'vitest';
import { venueSections, type GuideVenue } from '@/lib/domain/guide-entry';

const v = (name: string, o: Partial<GuideVenue> = {}): GuideVenue => ({
  section: 'Eat', area: 'St. Helier', name, label: '', size: 'listing', copy: '', address: '', phone: '', email: '', website: '', imageUrl: '', preview: '', options: [], ...o,
});

describe('venueSections', () => {
  it('puts the sections in the order the guide prints them, unknown ones after', () => {
    const out = venueSections([v('A', { section: 'Eat' }), v('B', { section: 'Stay' }), v('C', { section: 'Visit' }), v('D', { section: 'Buy' })]);
    expect(out.map((s) => s.section)).toEqual(['Visit', 'Buy', 'Eat', 'Stay']);
  });

  it('orders areas as the guide reads the island, then others, then none', () => {
    const out = venueSections([v('A', { area: '' }), v('B', { area: 'Gorey' }), v('C', { area: 'Trinity' }), v('D', { area: 'St. Helier' })]);
    expect(out[0]!.areas.map((a) => a.area)).toEqual(['St. Helier', 'Gorey', 'Trinity', '']);
  });

  it('gives a full-page entry a page of its own, before the grids', () => {
    const [area] = venueSections([v('Listing'), v('Azure', { size: 'full' })])[0]!.areas;
    expect(area!.pages.map((p) => p.kind)).toEqual(['full', 'grid']);
  });

  it('puts the bigger entries first, each on the first page with rows for it, then fills with listings two to a row', () => {
    const listings = Array.from({ length: 13 }, (_, i) => v(`L${String(i).padStart(2, '0')}`));
    const [area] = venueSections([...listings, v('Phire', { size: 'half' }), v('Zest', { size: 'three-quarters' }), v('Drew', { size: 'quarter' }), v('Moor', { size: 'half' })])[0]!.areas;
    const grids = area!.pages.map((p) => (p.kind === 'grid' ? p.cells.map((c) => `${c.frame}:${c.name}`) : []));
    // Three-quarters and a quarter fill one page; the two halves the next.
    expect(grids[0]).toEqual(['three-quarters:Zest', 'quarter:Drew']);
    expect(grids[1]).toEqual(['half:Moor', 'half:Phire']);
    expect(grids[2]).toHaveLength(8);
    expect(grids[3]).toHaveLength(5);
  });

  it('fills the rows a big entry leaves with listings', () => {
    const listings = Array.from({ length: 5 }, (_, i) => v(`L${i}`));
    const [area] = venueSections([...listings, v('Phire', { size: 'half' })])[0]!.areas;
    const grids = area!.pages.map((p) => (p.kind === 'grid' ? p.cells.map((c) => c.frame) : []));
    expect(grids[0]).toEqual(['half', 'listing', 'listing', 'listing', 'listing']);
    expect(grids[1]).toEqual(['listing']);
  });

  it('keeps directory lines off the grid, for the area’s list', () => {
    const [area] = venueSections([v('Bar', { size: 'directory' }), v('Cafe')])[0]!.areas;
    expect(area!.directory.map((d) => d.name)).toEqual(['Bar']);
    expect(area!.pages).toHaveLength(1);
  });
});
