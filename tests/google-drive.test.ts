import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/env', () => ({ env: { NEXT_PUBLIC_APP_URL: 'https://guide.je', GOOGLE_OAUTH_CLIENT_ID: 'id', GOOGLE_OAUTH_CLIENT_SECRET: 'secret' } }));
const { consentUrl, folderIdFrom, redirectUri } = await import('@/lib/integrations/google/drive');

describe('Google Drive', () => {
  it('reads a folder id from its Drive link, an open link, or the id', () => {
    expect(folderIdFrom('https://drive.google.com/drive/folders/1_jddC5dG3BIMjlTRusZc8g4ItmQ8RnN4?usp=sharing')).toBe('1_jddC5dG3BIMjlTRusZc8g4ItmQ8RnN4');
    expect(folderIdFrom('https://drive.google.com/drive/u/0/folders/1_jddC5dG3BIMjlTRusZc8g4ItmQ8RnN4')).toBe('1_jddC5dG3BIMjlTRusZc8g4ItmQ8RnN4');
    expect(folderIdFrom('https://drive.google.com/open?id=1_jddC5dG3BIMjlTRusZc8g4ItmQ8RnN4')).toBe('1_jddC5dG3BIMjlTRusZc8g4ItmQ8RnN4');
    expect(folderIdFrom(' 1_jddC5dG3BIMjlTRusZc8g4ItmQ8RnN4 ')).toBe('1_jddC5dG3BIMjlTRusZc8g4ItmQ8RnN4');
    expect(folderIdFrom('vjvg_working')).toBeNull();
  });

  it('asks Google for offline access to Drive, coming back to the guide', () => {
    const url = new URL(consentUrl('st'));
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri());
    expect(redirectUri()).toBe('https://guide.je/admin/guide/drive/callback');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('scope')).toContain('auth/drive');
    expect(url.searchParams.get('state')).toBe('st');
  });
});
