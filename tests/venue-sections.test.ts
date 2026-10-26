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

  it('opens a grid page with each two-thirds entry and four listings under it, then fills grids of eight', () => {
    const listings = Array.from({ length: 13 }, (_, i) => v(`L${String(i).padStart(2, '0')}`));
    const [area] = venueSections([...listings, v('Phire', { size: 'two-thirds' })])[0]!.areas;
    const grids = area!.pages.map((p) => (p.kind === 'grid' ? p.cells.map((c) => `${c.frame}:${c.name}`) : []));
    expect(grids[0]).toEqual(['feature:Phire', 'listing:L00', 'listing:L01', 'listing:L02', 'listing:L03']);
    expect(grids[1]).toHaveLength(8);
    expect(grids[2]).toEqual(['listing:L12']);
  });

  it('keeps directory lines off the grid, for the area’s list', () => {
    const [area] = venueSections([v('Bar', { size: 'directory' }), v('Cafe')])[0]!.areas;
    expect(area!.directory.map((d) => d.name)).toEqual(['Bar']);
    expect(area!.pages).toHaveLength(1);
  });
});
