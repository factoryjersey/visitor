import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/env', () => ({ env: {} }));
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

describe('storage credentials', () => {
  it('sends a legacy JWT key as a bearer token and a new secret key as the apikey alone', async () => {
    const { storageAuth } = await import('@/lib/images/upload');
    expect(storageAuth('eyJhbGciOi.x.y')).toEqual({ apikey: 'eyJhbGciOi.x.y', authorization: 'Bearer eyJhbGciOi.x.y' });
    expect(storageAuth('sb_secret_abc')).toEqual({ apikey: 'sb_secret_abc' });
  });
});
