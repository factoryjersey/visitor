import { describe, expect, it } from 'vitest';
import { matchVenueNames } from '@/lib/domain/venue-tags';

const venues = [
  { id: '1', name: 'Hotel de France' },
  { id: '2', name: 'The Atlantic Hotel' },
  { id: '3', name: 'Banjo' },
  { id: '4', name: 'Jersey Pottery Gorey' },
  { id: '5', name: 'Jersey Pottery St Helier' },
];

describe('matching a list of names to venues', () => {
  it('matches the same name however it is written, and a fuller or shorter one when only one venue fits', () => {
    const r = matchVenueNames(['Atlantic Hotel', 'BANJO', 'Hotel de France Jersey', 'Nowhere Café', ''], venues);
    expect(r.matched.map((m) => m.venue.id)).toEqual(['2', '3', '1']);
    expect(r.unmatched).toEqual(['Nowhere Café']);
  });

  it('reports a name more than one venue fits rather than guess', () => {
    const r = matchVenueNames(['Jersey Pottery'], venues);
    expect(r.ambiguous[0]!.venues.map((v) => v.id)).toEqual(['4', '5']);
  });
});
