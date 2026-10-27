import { describe, expect, it } from 'vitest';
import { areaKey, layoutsFrom, layoutsQuery, venueSections, type GuideVenue } from '@/lib/domain/guide-entry';

const v = (name: string, o: Partial<GuideVenue> = {}): GuideVenue => ({
  section: 'Eat', area: 'St. Helier', name, label: '', size: 'listing', isNew: false, copy: '', address: '', phone: '', email: '', website: '', imageUrl: '', preview: '', options: [], ...o,
});

describe('venueSections', () => {
  it('puts the sections in the order the guide prints them, unknown ones after', () => {
    const out = venueSections([v('A', { section: 'Eat' }), v('B', { section: 'Stay' }), v('C', { section: 'Visit' }), v('D', { section: 'Buy' })]);
    expect(out.map((s) => s.section)).toEqual(['Visit', 'Buy', 'Eat', 'Stay']);
  });

  it('runs a section’s areas on together, as the guide reads the island, each box with its area’s marker', () => {
    const out = venueSections([v('A', { area: '' }), v('B', { area: 'Gorey' }), v('C', { area: 'Trinity' }), v('D', { area: 'St. Helier' })]);
    expect(out[0]!.pages).toHaveLength(1);
    const cells = out[0]!.pages[0]!.kind === 'grid' ? out[0]!.pages[0]!.cells : [];
    expect(cells.map((c) => `${c.areaCode}:${c.name}`)).toEqual(['SH:D', 'GY:B', 'T:C', ':A']);
    expect(out[0]!.key).toEqual([{ code: 'SH', area: 'St. Helier' }, { code: 'GY', area: 'Gorey' }, { code: 'T', area: 'Trinity' }]);
  });

  it('fills the last rows of one area with the next, leaving no part-empty pages between', () => {
    const out = venueSections([...Array.from({ length: 5 }, (_, i) => v(`S${i}`)), ...Array.from({ length: 5 }, (_, i) => v(`G${i}`, { area: 'Gorey' }))]);
    expect(out[0]!.pages.map((p) => (p.kind === 'grid' ? p.cells.length : 1))).toEqual([8, 2]);
  });

  it('keys areas by their own markers, else initials made unlike the others', () => {
    expect(areaKey(['Golf', 'Gorey', 'Grouville', 'Green Island', 'Gold Coast']).map((k) => k.code)).toEqual(['GF', 'GY', 'G', 'GI', 'GC']);
    expect(areaKey(['St. Ouen', 'St. Ouens Bay']).map((k) => k.code)).toEqual(['SO', 'SOB']);
    expect(areaKey(['Sark', 'Sorel']).map((k) => k.code)).toEqual(['S', 'SO']);
  });

  it('gives a full-page entry a page of its own, before the grids', () => {
    const [section] = venueSections([v('Listing'), v('Azure', { size: 'full' })]);
    expect(section!.pages.map((p) => p.kind)).toEqual(['full', 'grid']);
  });

  it('puts the bigger entries first, each on the first page with rows for it, then fills with listings two to a row', () => {
    const listings = Array.from({ length: 13 }, (_, i) => v(`L${String(i).padStart(2, '0')}`));
    const [section] = venueSections([...listings, v('Phire', { size: 'half' }), v('Zest', { size: 'three-quarters' }), v('Drew', { size: 'quarter' }), v('Moor', { size: 'half' })]);
    const grids = section!.pages.map((p) => (p.kind === 'grid' ? p.cells.map((c) => `${c.frame}:${c.name}`) : []));
    // Three-quarters and a quarter fill one page; the two halves the next.
    expect(grids[0]).toEqual(['three-quarters:Zest', 'quarter:Drew']);
    expect(grids[1]).toEqual(['half:Moor', 'half:Phire']);
    expect(grids[2]).toHaveLength(8);
    expect(grids[3]).toHaveLength(5);
  });

  it('fills the rows a big entry leaves with listings', () => {
    const listings = Array.from({ length: 5 }, (_, i) => v(`L${i}`));
    const [section] = venueSections([...listings, v('Phire', { size: 'half' })]);
    const grids = section!.pages.map((p) => (p.kind === 'grid' ? p.cells.map((c) => c.frame) : []));
    expect(grids[0]).toEqual(['half', 'listing', 'listing', 'listing', 'listing']);
    expect(grids[1]).toEqual(['listing']);
  });

  it('keeps directory lines off the grid, for the section’s list', () => {
    const [section] = venueSections([v('Bar', { size: 'directory' }), v('Cafe')]);
    expect(section!.directory.map((d) => d.name)).toEqual(['Bar']);
    expect(section!.pages).toHaveLength(1);
  });

  it('on the grid of sixteen gives booked space the same share of a page, and listings a sixteenth', () => {
    const listings = Array.from({ length: 21 }, (_, i) => v(`L${String(i).padStart(2, '0')}`));
    const [section] = venueSections([...listings, v('Gems', { size: 'three-quarters' }), v('Drew', { size: 'quarter' })], () => 'grid16');
    expect(section!.grid).toBe('grid16');
    const grids = section!.pages.map((p) => (p.kind === 'grid' ? p.cells.map((c) => c.frame) : []));
    // Three-quarters (six rows) and a quarter (two) fill a page; then sixteen listings, then five.
    expect(grids[0]).toEqual(['three-quarters', 'quarter']);
    expect(grids[1]).toHaveLength(16);
    expect(grids[2]).toHaveLength(5);
  });

  it('fills what three-quarters leaves on the grid of sixteen with four listings', () => {
    const listings = Array.from({ length: 4 }, (_, i) => v(`L${i}`));
    const [section] = venueSections([...listings, v('Gems', { size: 'three-quarters' })], () => 'grid16');
    const grids = section!.pages.map((p) => (p.kind === 'grid' ? p.cells.map((c) => c.frame) : []));
    expect(grids).toEqual([['three-quarters', 'listing', 'listing', 'listing', 'listing']]);
  });
});

describe('the template in the address', () => {
  const read = (q: string) => layoutsFrom((k) => new URLSearchParams(q).get(k));

  it('chooses each part, defaulting as before', () => {
    expect(read('')).toEqual({ events: 'top', tours: 'columns', venues: {} });
    expect(read('grid=grid8')).toEqual({ events: 'grid8', tours: 'grid8', venues: {} });
    expect(read('grid=grid16&tours=columns&venues=Eat:grid16,Buy:grid8,Nope:grid99')).toEqual({ events: 'grid16', tours: 'columns', venues: { Eat: 'grid16', Buy: 'grid8' } });
  });

  it('writes back only what is not the default', () => {
    expect(layoutsQuery({ events: 'top', tours: 'columns', venues: { Buy: 'grid8' } })).toBe('');
    expect(read(layoutsQuery({ events: 'grid8', tours: 'grid16', venues: { Eat: 'grid16' } }))).toEqual({ events: 'grid8', tours: 'grid16', venues: { Eat: 'grid16' } });
  });
});
