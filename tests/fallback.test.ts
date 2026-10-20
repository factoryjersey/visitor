import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ db: {} }));
const { fallbackFor } = await import('@/lib/images/fallback');

const img = (url: string) => ({ url, publicId: null, alt: null, originalFilename: null });

describe('fallback pictures', () => {
  const byOrganiser = new Map([['jerseyrfc', img('https://x/rfc.jpg')]]);
  const byVenue = new Map([['v1', img('https://x/ground.jpg')]]);

  it('takes the venue’s first', () => {
    expect(fallbackFor({ organiser: 'Jersey RFC', placeId: 'v1' }, byOrganiser, byVenue)).toEqual({ image: img('https://x/ground.jpg'), ref: 'venue/v1' });
  });

  it('then the organiser’s, however the source spells them, then none', () => {
    expect(fallbackFor({ organiser: 'The Jersey R.F.C.', placeId: null }, byOrganiser, byVenue)?.ref).toBe('organiser/jerseyrfc');
    expect(fallbackFor({ organiser: 'Jersey RFC', placeId: 'v2' }, byOrganiser, byVenue)?.ref).toBe('organiser/jerseyrfc');
    expect(fallbackFor({ organiser: null, placeId: 'v2' }, byOrganiser, byVenue)).toBeNull();
  });
});
