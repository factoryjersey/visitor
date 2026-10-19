import { describe, expect, it, vi } from 'vitest';
import { stockLibrary, stockQuery } from '@/lib/integrations/stock/images';
import { webImage } from '@/lib/domain/images';

describe('stock pictures', () => {
  it('picks the sport for the clubs’ matches, and the kind for the rest', () => {
    expect(stockQuery({ id: '1', title: 'Jersey Bulls v Moneyfields', organiser: 'Jersey Bulls' })).toBe('football match stadium');
    expect(stockQuery({ id: '2', title: 'Jersey RFC v Oundle', organiser: 'Jersey RFC' })).toBe('rugby match');
    expect(stockQuery({ id: '3', title: 'An evening of jazz', eventTypes: ['Music', 'Food & drink'] })).toBe('live music concert stage');
    expect(stockQuery({ id: '4', title: 'Tide walk', genre: 'On foot' })).toBe('guided walking tour coast');
    expect(stockQuery({ id: '5', title: 'Something else' })).toBe('jersey channel islands coast');
  });

  it('gives a listing the same picture every time, credited, from one search per kind', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ results: [1, 2, 3].map((n) => ({ url: `https://example.org/${n}.jpg`, thumbnail: `https://example.org/${n}-thumb.jpg`, creator: `Photographer ${n}` })) })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const lib = stockLibrary();
    const a = await lib.pick({ id: 'abc', title: 'Jersey RFC v Oundle' });
    const b = await lib.pick({ id: 'abc', title: 'Jersey RFC v Canterbury' });
    expect(a).toEqual(b);
    expect(a?.url).toMatch(/-thumb\.jpg$/);
    expect(a?.credit).toMatchObject({ source: 'Openverse' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('sizes a Pexels picture by its URL', () => {
    expect(webImage({ url: 'https://images.pexels.com/photos/1/a.jpeg?auto=compress&w=1880', publicId: null, alt: null, originalFilename: null }, 600, 400)).toBe(
      'https://images.pexels.com/photos/1/a.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    );
  });
});
