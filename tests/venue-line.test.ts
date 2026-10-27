import { describe, expect, it } from 'vitest';
import { usableLine } from '@/lib/integrations/claude/venue-line';

describe('a venue line for its box in the guide', () => {
  it('takes one finished sentence that fits', () => {
    expect(usableLine('A family-run bakery for sourdough, pastries and good coffee by the harbour.')).toBe(true);
  });
  it('turns away one that trails off, runs long or never ends', () => {
    expect(usableLine('A bakery…')).toBe(false);
    expect(usableLine('A bakery for sourdough')).toBe(false);
    expect(usableLine(`${'A long line about a bakery and its many loaves '.repeat(4)}.`)).toBe(false);
  });
});
