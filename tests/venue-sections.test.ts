import { describe, expect, it } from 'vitest';
import { areaKey, budgetFor, layoutsFrom, layoutsQuery, venueGridFor, venueSections, nameFits, type GuideVenue } from '@/lib/domain/guide-entry';

const v = (name: string, o: Partial<GuideVenue> = {}): GuideVenue => ({
  section: 'Buy', area: 'St. Helier', name, label: '', size: 'listing', isNew: false, copy: '', address: '', phone: '', email: '', website: '', imageUrl: '', preview: '', options: [], featured: false, printed: false, opening: '', bus: '', ...o,
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

  it('runs Eat area by area, as the 2026 editions did: each area from a page of its own, named on it', () => {
    const eat = (name: string, area: string) => v(name, { section: 'Eat', area });
    const [s] = venueSections([...Array.from({ length: 5 }, (_, i) => eat(`S${i}`, 'St. Helier')), eat('E0', 'East'), eat('W0', 'West'), eat('W1', 'West')]);
    expect(s!.byArea).toBe(true);
    expect(s!.pages.map((p) => [p.area, p.kind === 'grid' ? p.cells.length : 1])).toEqual([['St. Helier', 5], ['East', 1], ['West', 2]]);
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

describe('a section rationed to so many pages of listings', () => {
  it('keeps boxes for those featured, printed before, new, then pictured, and indexes the rest by area', () => {
    const listings = Array.from({ length: 12 }, (_, i) => v(`L${String(i).padStart(2, '0')}`, { area: i % 2 ? 'Gorey' : 'St. Helier' }));
    const special = [v('Feat', { featured: true, area: 'Gorey' }), v('Old', { printed: true }), v('Pic', { imageUrl: 'x' }), v('Neu', { isNew: true })];
    const [s] = venueSections([...listings, ...special, v('Big', { size: 'three-quarters' }), v('Line', { size: 'directory' })], () => 'grid8', () => 1);
    const boxed = s!.pages.flatMap((p) => (p.kind === 'grid' ? p.cells.map((c) => c.name) : []));
    // The three-quarters page leaves a row (two listings), and one page more holds eight.
    expect(boxed).toHaveLength(11);
    expect(boxed).toEqual(expect.arrayContaining(['Feat', 'Old', 'Neu', 'Pic']));
    expect(s!.pages).toHaveLength(2);
    expect(s!.directory).toHaveLength(17 - 10 + 0);
    expect(s!.directory.map((d) => d.area)).toEqual([...s!.directory.map((d) => d.area)].sort((a, b) => (a === 'St. Helier' ? -1 : 0) - (b === 'St. Helier' ? -1 : 0)));
    expect(s!.directory.map((d) => d.name)).toContain('Line');
  });

  it('with no pages, puts every listing in the index', () => {
    const [s] = venueSections([v('A'), v('B')], () => 'grid8', () => 0);
    expect(s!.pages).toHaveLength(0);
    expect(s!.directory.map((d) => d.name)).toEqual(['A', 'B']);
  });
});

describe('the template in the address', () => {
  const read = (q: string) => layoutsFrom((k) => new URLSearchParams(q).get(k));

  it('chooses each part, dated tours on the grid of six by default', () => {
    expect(read('')).toEqual({ events: 'top', tours: 'grid6', ongoing: 'grid6', venues: {}, budgets: {} });
    expect(read('grid=grid8')).toEqual({ events: 'grid8', tours: 'grid6', ongoing: 'grid6', venues: {}, budgets: {} });
    expect(read('grid=grid8&tours=columns&ongoing=grid16')).toMatchObject({ tours: 'columns', ongoing: 'grid16' });
    expect(read('grid=grid16&tours=columns&venues=Eat:grid16,Buy:grid8,Nope:grid99&budget=Eat:all,Buy:1,See:x')).toEqual({ events: 'grid16', tours: 'columns', ongoing: 'columns', venues: { Eat: 'grid16', Buy: 'grid8' }, budgets: { Eat: null, Buy: 1 } });
  });

  it('writes back only what is not the default', () => {
    expect(layoutsQuery({ events: 'top', tours: 'grid6', ongoing: 'grid6', venues: { Buy: 'grid8' }, budgets: { Eat: 2 } })).toBe('');
    expect(layoutsQuery({ events: 'top', tours: 'columns', ongoing: 'columns', venues: {}, budgets: {} })).toBe('tours=columns');
    const l = { events: 'grid8', tours: 'grid16', ongoing: 'grid8', venues: { Eat: 'grid16' }, budgets: { Eat: null, Buy: 3 } } as const;
    expect(read(layoutsQuery({ ...l, venues: { ...l.venues }, budgets: { ...l.budgets } }))).toEqual(l);
  });

  it('rations Eat, Buy and Visit unless chosen otherwise', () => {
    expect(budgetFor(read(''), 'Eat')).toBe(2);
    expect(budgetFor(read('budget=Eat:all'), 'Eat')).toBeNull();
    expect(budgetFor(read(''), 'Buy')).toBe(1);
    expect(budgetFor(read(''), 'Visit')).toBe(0);
    expect(budgetFor(read(''), 'See')).toBeNull();
  });
});

describe('Eat by area, as the last edition runs it', () => {
  it('puts St Helier, then East, then West, however St Helier is written', () => {
    const out = venueSections([v('W1', { area: 'West' }), v('E1', { area: 'East' }), v('H1', { area: 'St Helier' }), v('N1', { area: '' })]);
    expect(out[0]!.key.map((k) => k.area)).toEqual(['St Helier', 'East', 'West']);
    expect(out[0]!.key[0]!.code).toBe('SH');
  });
});

describe('Pubs & bars', () => {
  it('prints as a section of its own after Eat, on the grid of sixteen unless chosen', () => {
    const out = venueSections([v('Bar', { section: 'Pubs & bars', area: 'West' }), v('Cafe', { section: 'Eat', area: 'St Helier' }), v('Shop', { section: 'Buy', area: '' })]);
    expect(out.map((s) => s.section)).toEqual(['Buy', 'Eat', 'Pubs & bars']);
    expect(venueGridFor({ venues: {} }, 'Pubs & bars')).toBe('grid16');
    expect(venueGridFor({ venues: { 'Pubs & bars': 'grid8' } }, 'Pubs & bars')).toBe('grid8');
    expect(venueGridFor({ venues: {} }, 'Eat')).toBe('grid8');
  });
});

describe('the Beaches section', () => {
  it('prints after See and before Do, as the Beach Guide pages did', () => {
    const out = venueSections([v('Do it', { section: 'Do' }), v('Beauport', { section: 'Beaches', area: 'South' }), v('Castle', { section: 'See' })]);
    expect(out.map((s) => s.section)).toEqual(['See', 'Beaches', 'Do']);
  });

  it('reads the island by coast: east, north, west, then south', () => {
    const out = venueSections([
      v('St. Brelade’s Bay', { section: 'Beaches', area: 'South' }),
      v('Plémont', { section: 'Beaches', area: 'North' }),
      v('St. Ouen’s Bay', { section: 'Beaches', area: 'West' }),
      v('Archirondel', { section: 'Beaches', area: 'East' }),
    ]);
    const names = out[0]!.pages.flatMap((p) => (p.kind === 'grid' ? p.cells.map((c) => c.name) : []));
    expect(names).toEqual(['Archirondel', 'Plémont', 'St. Ouen’s Bay', 'St. Brelade’s Bay']);
    expect(out[0]!.key.map((k) => k.code)).toEqual(['E', 'N', 'W', 'S']);
  });
});

describe('facingWords', () => {
  it('reads the printed letters as words for the site', async () => {
    const { facingWords } = await import('@/lib/domain/beaches');
    expect(facingWords('SW')).toBe('Faces south-west');
    expect(facingWords('n')).toBe('Faces north');
    expect(facingWords('NE')).toBe('Faces north-east');
    expect(facingWords('Sheltered')).toBe('Sheltered');
  });
});

describe('a beach as the guide prints it', () => {
  it('keeps its Beach Guide copy, not the one-liner, and prints its buses', async () => {
    const { guideVenue } = await import('@/lib/domain/guide-entry');
    type P = Parameters<typeof guideVenue>[0];
    const place = {
      name: 'Plémont Bay', category: 'see', guideSection: 'Beaches', guideArea: 'North', guideLabel: 'NW', listingSize: 'listing',
      guideCopy: 'A pristine sandy cove reachable by a long flight of steps. The beach is completely covered at high tide.',
      guideLine: 'A sandy cove below steps.', sourceNotes: [], summary: null, description: null, busRoutes: ['8'], parish: 'St Ouen', addressLine1: null,
      phone: null, email: null, website: null, headerImage: null, recommendedIn: null, firstListedAt: null, openingHours: null, openMonths: [],
    } as unknown as P;
    const v = guideVenue(place);
    expect(v.copy).toMatch(/^A pristine sandy cove/);
    expect(v.options[0]).toMatch(/covered at high tide/);
    expect(v.bus).toBe('8');
    expect(v.label).toBe('NW');
    // An Eat venue keeps its one line, and prints no buses.
    const eat = guideVenue({ ...place, category: 'eat-drink', guideSection: 'Eat' } as P);
    expect(eat.copy).toBe('A sandy cove below steps.');
    expect(eat.bus).toBe('');
  });
});

describe('noted', () => {
  it('puts the notes after the copy, both, then each, then none, before shorter copy', async () => {
    const { noted } = await import('@/lib/domain/guide-entry');
    const out = noted(['Long copy. More.', 'Long copy.'], [{ short: 'Geopark', text: 'Granite.' }, { short: 'National Park', text: 'Puffins.' }]);
    expect(out.slice(0, 4)).toEqual([
      'Long copy. More. Geopark: Granite. National Park: Puffins.',
      'Long copy. More. Geopark: Granite.',
      'Long copy. More. National Park: Puffins.',
      'Long copy. More.',
    ]);
    expect(out.at(-1)).toBe('Long copy.');
    expect(noted(['A.'], [])).toEqual(['A.']);
  });
});

describe('a venue line too long for its box', () => {
  it('has shorter forms, cut where a new clause starts, never inside a list', async () => {
    const { shorterLines } = await import('@/lib/domain/guide-entry');
    expect(shorterLines('A family-run seafood restaurant by the sea at Havre des Pas, serving local lobster, crab and oysters.')).toEqual(['A family-run seafood restaurant by the sea at Havre des Pas.']);
    expect(shorterLines("Hotel brasserie serving modern pan-European dishes from Jersey produce, with a terrace over St Aubin's Bay.")).toEqual(['Hotel brasserie serving modern pan-European dishes from Jersey produce.']);
    expect(shorterLines('A cosy pub.')).toEqual([]);
    expect(shorterLines("An intimate cocktail bar inspired by Jersey's wartime past, using local ingredients and hosting masterclasses.")).toEqual(["An intimate cocktail bar inspired by Jersey's wartime past."]);
    expect(shorterLines('Seasonal modern dining upstairs with local fish specials, and a cosy basement bar for cocktails and small plates.')).toContain('Seasonal modern dining upstairs with local fish specials.');
    expect(shorterLines('A lively evening spot with dining upstairs.')).toEqual(['A lively evening spot.']);
  });
});

describe('the grid of twelve for venues', () => {
  it('puts three-quarters and a quarter on one page, and two halves', () => {
    const [s] = venueSections([v('Big', { size: 'three-quarters' }), v('Small', { size: 'quarter' }), v('H1', { size: 'half' }), v('H2', { size: 'half' })], () => 'grid12');
    expect(s!.pages.map((p) => (p.kind === 'grid' ? p.cells.map((c) => c.frame) : []))).toEqual([['three-quarters', 'quarter'], ['half', 'half']]);
  });
  it('runs Pubs & bars area by area, as Eat', () => {
    const [s] = venueSections([v('P1', { section: 'Pubs & bars', area: 'West' }), v('P2', { section: 'Pubs & bars', area: 'St Helier' })]);
    expect(s!.pages.map((p) => p.area)).toEqual(['St Helier', 'West']);
  });
});

describe('a listing box from the guide’s own description', () => {
  it('tries it whole, then its first sentences, then a clause cut', async () => {
    const { lineOptions } = await import('@/lib/domain/guide-entry');
    const line = 'Local food and great service. There is a guarantee that the title dishes, bass and lobster, are served daily. The chef has local hidden treasures ready for you.';
    const o = lineOptions(line);
    expect(o[0]).toBe(line);
    expect(o).toContain('Local food and great service. There is a guarantee that the title dishes, bass and lobster, are served daily.');
    expect(o).toContain('Local food and great service.');
  });
});

describe('the What’s On opener', () => {
  it('is chosen by title and kept in the address', () => {
    const l = layoutsFrom((k) => new URLSearchParams('opener=Art+in+the+Arches').get(k));
    expect(l.opener).toBe('Art in the Arches');
    expect(layoutsQuery(l)).toBe('opener=Art+in+the+Arches');
    expect(layoutsFrom(() => null).opener).toBeUndefined();
  });
});

describe('long names on the small grids', () => {
  it('sends a listing whose name will not go on one line to the index, unless a client’s', () => {
    const long = 'The Champagne Lounge at Grand Jersey Hotel & Spa';
    const [s] = venueSections([v('Bento'), v(long), v(`${long} `.trim() + ' Bar', { client: true })], () => 'grid16');
    const boxed = s!.pages.flatMap((p) => (p.kind === 'grid' ? p.cells.map((c) => c.name) : []));
    expect(boxed).toEqual(['Bento', `${long} Bar`]);
    expect(s!.directory.map((d) => d.name)).toEqual([long]);
  });

  it('keeps every name on the grid of eight, where names have two lines', () => {
    const [s] = venueSections([v('The Champagne Lounge at Grand Jersey Hotel & Spa')]);
    expect(s!.directory).toEqual([]);
  });

  it('judges a short name to fit, a long one with its label not', () => {
    expect(nameFits(v('Bento', { label: 'JAPANESE' }), 'grid16')).toBe(true);
    expect(nameFits(v('The Lamplighter Real Ale Pub', { label: 'REAL ALE' }), 'grid16')).toBe(false);
  });
});
