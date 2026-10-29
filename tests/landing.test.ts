import { describe, expect, it } from 'vitest';
import { MARKERS } from '@/components/site/category-markers';
import { LANDING_TYPES, typeFromSlug, typePath, weekendRange } from '@/lib/domain/landing';

describe('What’s on landing pages', () => {
  it('has a page for every tile, at an address no event can have', () => {
    expect([...LANDING_TYPES]).toEqual(MARKERS.map(([t]) => t));
    expect(typePath('Food & drink')).toBe('/whats-on/food-and-drink');
    expect(typeFromSlug('history-and-heritage')).toBe('History & Heritage');
    expect(typeFromSlug('voices-of-the-1940s-act-ii-2026')).toBeNull();
    for (const t of LANDING_TYPES) expect(typePath(t)).not.toMatch(/-\d{4}$/);
  });

  it('means the coming weekend, Friday to Sunday, from today once it has begun', () => {
    expect(weekendRange('2026-10-27')).toEqual({ from: '2026-10-30', to: '2026-11-01' }); // a Tuesday
    expect(weekendRange('2026-10-30')).toEqual({ from: '2026-10-30', to: '2026-11-01' }); // Friday
    expect(weekendRange('2026-10-31')).toEqual({ from: '2026-10-31', to: '2026-11-01' }); // Saturday
    expect(weekendRange('2026-11-01')).toEqual({ from: '2026-11-01', to: '2026-11-01' }); // Sunday
  });
});
