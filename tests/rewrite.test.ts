import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: { ANTHROPIC_API_KEY: undefined } }));

describe('rewriteListing', () => {
  it('leaves the provider’s words alone without a key', async () => {
    const { rewriteListing } = await import('@/lib/integrations/claude/rewrite');
    expect(await rewriteListing({ kind: 'event', name: 'Quiz night', summary: null, description: 'Join us for our quiz!' })).toBeNull();
  });
});
