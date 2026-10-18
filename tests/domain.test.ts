import { describe, expect, it } from 'vitest';
import { mergeFromSource } from '@/lib/domain/merge';
import { isSamePlace } from '@/lib/domain/same-place';
import { uniqueSlug } from '@/lib/domain/slug';
import { openMonthsText, rateRange } from '@/lib/domain/format';
import { webImage } from '@/lib/domain/images';

const stamp = { source: 'visit_jersey', ref: 'accommodation/1', at: '2026-10-18T00:00:00Z' };

describe('mergeFromSource', () => {
  it('writes new values and records where they came from', () => {
    const r = mergeFromSource<Record<string, unknown>>({ name: 'Old' }, { name: 'New', phone: '01534' }, { locked: [], fieldSources: {}, stamp });
    expect(r.patch).toEqual({ name: 'New', phone: '01534' });
    expect(r.fieldSources.name).toEqual(stamp);
  });

  it('never writes a locked field', () => {
    const r = mergeFromSource<Record<string, unknown>>({ name: 'Ours' }, { name: 'Theirs' }, { locked: ['name'], fieldSources: {}, stamp });
    expect(r.patch).toEqual({});
  });

  it('does not clear a value another source supplied', () => {
    const other = { source: 'factoryos', ref: 'c1', at: '2026-01-01' };
    const r = mergeFromSource<Record<string, unknown>>({ phone: '01534' }, { phone: null }, { locked: [], fieldSources: { phone: other }, stamp });
    expect(r.patch).toEqual({});
    expect(r.fieldSources.phone).toEqual(other);
  });

  it('clears a value this same record has withdrawn', () => {
    const r = mergeFromSource<Record<string, unknown>>({ phone: '01534', facilities: ['Wifi'] }, { phone: null, facilities: [] }, {
      locked: [], fieldSources: { phone: stamp, facilities: stamp }, stamp,
    });
    expect(r.patch).toEqual({ phone: null, facilities: [] });
    expect(r.fieldSources.phone).toBeUndefined();
  });

  it('treats JSON with keys in another order as unchanged', () => {
    const r = mergeFromSource<Record<string, unknown>>(
      { dates: [{ end: '01:00', date: '2026-12-31', start: '19:00' }] },
      { dates: [{ date: '2026-12-31', start: '19:00', end: '01:00' }] },
      { locked: [], fieldSources: { dates: stamp }, stamp },
    );
    expect(r.changed).toEqual([]);
  });

  it('reports nothing changed when nothing did', () => {
    const r = mergeFromSource<Record<string, unknown>>({ name: 'Same' }, { name: 'Same' }, { locked: [], fieldSources: { name: stamp }, stamp });
    expect(r.changed).toEqual([]);
  });
});

describe('isSamePlace', () => {
  it('needs the name and the pin to agree', () => {
    const a = { name: 'The Old Bank House', lat: 49.1878, lon: -2.1672 };
    expect(isSamePlace(a, { name: 'Old Bank House', lat: 49.18785, lon: -2.16725 })).toBe(true);
    expect(isSamePlace(a, { name: 'Old Bank House', lat: 49.2, lon: -2.1 })).toBe(false);
    expect(isSamePlace(a, { name: 'Jersey Oak', lat: 49.1878, lon: -2.1672 })).toBe(false);
    expect(isSamePlace(a, { name: 'Old Bank House', lat: null, lon: null })).toBe(false);
  });
});

describe('uniqueSlug', () => {
  it('qualifies by parish before numbering', () => {
    const taken = new Set(['the-cafe', 'the-cafe-st-helier']);
    expect(uniqueSlug('The Café', (s) => taken.has(s), 'Grouville')).toBe('the-cafe-grouville');
    expect(uniqueSlug('The Café', (s) => taken.has(s), 'St Helier')).toBe('the-cafe-2');
  });
});

describe('format', () => {
  it('prints seasons, including one across the new year', () => {
    expect(openMonthsText([3, 4, 5, 6, 7, 8, 9, 10])).toBe('Mar–Oct');
    expect(openMonthsText([11, 12, 1, 2])).toBe('Nov–Feb');
    expect(openMonthsText([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe('All year');
    expect(openMonthsText([4, 6])).toBe('Apr, Jun');
    expect(openMonthsText([])).toBeNull();
  });

  it('prints rates', () => {
    expect(rateRange(13500, 29500)).toBe('£135–£295');
    expect(rateRange(9000, null)).toBe('£90');
    expect(rateRange(null, null)).toBeNull();
  });

  it('puts the Cloudinary transformation after /upload/', () => {
    expect(webImage({ url: 'https://cdn.jersey.com/image/upload/v1/a.jpg', publicId: null, alt: null, originalFilename: null }, 800, 600))
      .toBe('https://cdn.jersey.com/image/upload/w_800,h_600,c_fill,g_auto,q_auto,f_auto/v1/a.jpg');
  });
});

import { eventDatesText } from '@/lib/domain/format';

describe('eventDatesText', () => {
  it('prints one, a few, and many dates', () => {
    expect(eventDatesText([{ date: '2026-12-31', start: '19:00' }])).toBe('Thu 31 Dec 2026, 19:00');
    expect(eventDatesText([{ date: '2026-10-17', start: null }, { date: '2026-10-18', start: null }])).toBe('Sat 17, Sun 18 Oct 2026');
    const many = Array.from({ length: 5 }, (_, i) => ({ date: `2026-10-1${i + 1}`, start: null }));
    expect(eventDatesText(many)).toBe('11 Oct 2026 – 15 Oct 2026 (5 dates)');
    expect(eventDatesText([])).toBeNull();
  });
});

import { matchVenue, tidyVenue } from '@/lib/domain/venue-match';

describe('matchVenue', () => {
  const museum = { id: 'm', name: 'Hamptonne Country Life Museum', lat: 49.2290, lon: -2.1350 };
  const flat = { id: 'f', name: 'Stable Apartment at Hamptonne', lat: 49.2291, lon: -2.1351 };

  it('needs the name, not just the pin', () => {
    const pin = { lat: 49.2291, lon: -2.1351 };
    expect(matchVenue('Hamptonne Country Life Museum, Rue de la Patente, Jersey', pin, [flat, museum])?.id).toBe('m');
    expect(matchVenue('Hamptonne Country Life Museum, Rue de la Patente', pin, [flat])).toBeNull();
  });

  it('ignores a matching name far away', () => {
    expect(matchVenue('Hamptonne Country Life Museum', { lat: 49.18, lon: -2.1 }, [museum])).toBeNull();
  });

  it('tidies venue text', () => {
    expect(tidyVenue('Elizabeth Marina, Elizabeth Marina, Castle Street, Saint Helier, Jersey')).toBe('Elizabeth Marina, Castle Street, St Helier');
  });
});
