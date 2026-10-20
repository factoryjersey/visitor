import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ db: {} }));
const { fallbackFor } = await import('@/lib/images/fallback');

const img = (url: string) => ({ url, publicId: null, alt: null, originalFilename: null });

describe('fallback pictures', () => {
  const byOrganiser = new Map([['jerseyrfc', img('https://x/rfc.jpg')]]);
  const byVenue = new Map([['v1', img('https://x/ground.jpg')]]);

  it('takes the organiser’s picture first, however the source spells them', () => {
    expect(fallbackFor({ organiser: 'Jersey RFC', placeId: 'v1' }, byOrganiser, byVenue)).toEqual({ image: img('https://x/rfc.jpg'), ref: 'organiser/jerseyrfc' });
    expect(fallbackFor({ organiser: 'The Jersey R.F.C.', placeId: null }, byOrganiser, byVenue)?.ref).toBe('organiser/jerseyrfc');
  });

  it('then the venue’s, then none', () => {
    expect(fallbackFor({ organiser: 'Someone else', placeId: 'v1' }, byOrganiser, byVenue)?.ref).toBe('venue/v1');
    expect(fallbackFor({ organiser: null, placeId: 'v2' }, byOrganiser, byVenue)).toBeNull();
  });
});
