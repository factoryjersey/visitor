import { describe, expect, it } from 'vitest';
import { areaCounts, areaFromSlug, areaOf, areaSlug, fit, kindCounts, likeEscape, narrow, searchWords, sortHits, type Hit } from '@/lib/domain/search';

const hit = (o: Partial<Hit> & Pick<Hit, 'kind' | 'id'>): Hit => ({ href: `/${o.id}`, title: o.id, area: null, when: null, line: null, image: null, highlight: false, fit: 0, order: o.id, ...o });

describe('searchWords', () => {
  it('lower-cases, splits, trims punctuation and keeps each word once', () => {
    expect(searchWords('  Jazz, at  ST. Helier jazz! ')).toEqual(['jazz', 'at', 'st', 'helier']);
  });
  it('is nothing for nothing typed', () => {
    expect(searchWords(undefined)).toEqual([]);
    expect(searchWords(' – ')).toEqual([]);
  });
  it('keeps accented letters', () => {
    expect(searchWords('Jèrriais')).toEqual(['jèrriais']);
  });
});

describe('likeEscape', () => {
  it('makes % and _ literal', () => {
    expect(likeEscape('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
});

describe('fit', () => {
  it('ranks a title starting with the search first, then one with every word, then some', () => {
    expect(fit('Jazz on the Pier', ['jazz', 'on'])).toBe(0);
    expect(fit('Pier jazz night', ['jazz', 'pier'])).toBe(1);
    expect(fit('Jazz night', ['jazz', 'helier'])).toBe(2);
    expect(fit('Live at the Arts Centre', ['jazz'])).toBe(3);
  });
  it('ignores accents', () => {
    expect(fit('Fête du Noué', ['fete'])).toBe(0);
  });
});

describe('areas', () => {
  it('reads a parish however it is spelt, and round-trips its slug', () => {
    expect(areaOf(null, 'Saint Brelade')).toBe('St Brelade');
    expect(areaOf('St. Helier', 'Trinity')).toBe('St Helier');
    expect(areaOf('Jersey')).toBeNull();
    expect(areaSlug('St Brelade')).toBe('st-brelade');
    expect(areaFromSlug('st-brelade')).toBe('St Brelade');
    expect(areaFromSlug('nowhere')).toBeNull();
  });
});

describe('narrowing and counting', () => {
  const hits = [
    hit({ kind: 'events', id: 'e1', area: 'St Helier' }),
    hit({ kind: 'events', id: 'e2', area: 'St Brelade' }),
    hit({ kind: 'tours', id: 't1', area: 'St Helier' }),
    hit({ kind: 'venues', id: 'v1', area: 'St Helier' }),
    hit({ kind: 'venues', id: 'v2', area: null }),
  ];

  it('counts kinds in the area chosen', () => {
    expect(kindCounts(hits, null)).toEqual({ all: 5, events: 2, tours: 1, venues: 2 });
    expect(kindCounts(hits, 'St Helier')).toEqual({ all: 3, events: 1, tours: 1, venues: 1 });
  });

  it('counts areas for the kind chosen, in the island order, keeping the one chosen at none', () => {
    expect(areaCounts(hits, undefined, null)).toEqual([
      { area: 'St Brelade', slug: 'st-brelade', n: 1 },
      { area: 'St Helier', slug: 'st-helier', n: 3 },
    ]);
    expect(areaCounts(hits, 'tours', 'St Brelade')).toEqual([
      { area: 'St Brelade', slug: 'st-brelade', n: 0 },
      { area: 'St Helier', slug: 'st-helier', n: 1 },
    ]);
  });

  it('narrows by kind and area together', () => {
    expect(narrow(hits, { kind: 'events', area: 'St Helier' }).map((h) => h.id)).toEqual(['e1']);
    expect(narrow(hits, {}).length).toBe(5);
  });
});

describe('sortHits', () => {
  it('puts better fits first, then highlights, then by order', () => {
    const sorted = sortHits([
      hit({ kind: 'events', id: 'late', fit: 1, order: '2026-12-01' }),
      hit({ kind: 'events', id: 'soon', fit: 1, order: '2026-11-01' }),
      hit({ kind: 'events', id: 'starred', fit: 1, order: '2026-12-31', highlight: true }),
      hit({ kind: 'events', id: 'best', fit: 0, order: '2027-01-01' }),
    ]);
    expect(sorted.map((h) => h.id)).toEqual(['best', 'starred', 'soon', 'late']);
  });
});
