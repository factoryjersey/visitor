import { describe, expect, it } from 'vitest';
import { fit, kindCounts, likeEscape, parishFrom, searchWords, sortHits, type Hit } from '@/lib/domain/search';

const hit = (o: Partial<Hit> & Pick<Hit, 'kind' | 'id'>): Hit => ({ href: `/${o.id}`, title: o.id, parish: null, when: null, line: null, image: null, highlight: false, fit: 0, order: o.id, ...o });

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

describe('parishFrom', () => {
  it('reads a parish however it is spelt, from the first label that has one', () => {
    expect(parishFrom(null, 'Saint Brelade')).toBe('St Brelade');
    expect(parishFrom('St. Helier', 'Trinity')).toBe('St Helier');
    expect(parishFrom('Jersey')).toBeNull();
  });
});

describe('kindCounts', () => {
  it('counts each kind and all', () => {
    const hits = [hit({ kind: 'events', id: 'e1' }), hit({ kind: 'events', id: 'e2' }), hit({ kind: 'tours', id: 't1' }), hit({ kind: 'venues', id: 'v1' })];
    expect(kindCounts(hits)).toEqual({ all: 4, events: 2, tours: 1, experiences: 0, venues: 1 });
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
  it('puts ongoing listings, ordered under ~, after the dated', () => {
    const sorted = sortHits([hit({ kind: 'events', id: 'weekly', order: '~2026-10-30' }), hit({ kind: 'events', id: 'dated', order: '2026-11-02' })]);
    expect(sorted.map((h) => h.id)).toEqual(['dated', 'weekly']);
  });
});
