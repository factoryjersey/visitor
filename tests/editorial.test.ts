import { describe, expect, it } from 'vitest';
import { promotion, spread, type Editorial } from '@/lib/domain/editorial';

const v = (name: string, o: Partial<Editorial> = {}): Editorial => ({ name, listingSize: 'listing', recommendedIn: null, guideCopy: null, headerImage: { url: `https://x/${name}.jpg` }, ...o });

describe('a guide section as a magazine spread', () => {
  it('ranks by the space the printed guide gave', () => {
    expect(promotion(v('a', { listingSize: 'full' }))).toBeGreaterThan(promotion(v('b', { listingSize: 'two-thirds' })));
    expect(promotion(v('b', { listingSize: 'two-thirds' }))).toBeGreaterThan(promotion(v('c', { recommendedIn: 'Autumn 2026' })));
    expect(promotion(v('c', { recommendedIn: 'Autumn 2026' }))).toBeGreaterThan(promotion(v('d', { guideCopy: 'Ours.' })));
    expect(promotion(v('e'))).toBe(0);
  });

  it('leads with the most promoted, tells the next as stories, and lists the rest A to Z', () => {
    const s = spread(
      [v('Zest'), v('Bistro', { recommendedIn: 'Autumn 2026' }), v('Atlantic', { listingSize: 'full' }), v('Cafe', { guideCopy: 'Ours.' }), v('Deli'), v('Bar')],
      { stories: 2, sidebar: 2 },
    );
    expect(s.lead?.name).toBe('Atlantic');
    expect(s.stories.map((x) => x.name)).toEqual(['Bistro', 'Cafe']);
    expect(s.sidebar.map((x) => x.name)).toEqual(['Bar', 'Deli']);
    expect(s.rest.map((x) => x.name)).toEqual(['Zest']);
  });

  it('gives no story to a venue without a picture or without promotion', () => {
    const s = spread([v('Full', { listingSize: 'full', headerImage: null }), v('Plain')], { stories: 2, sidebar: 3 });
    expect(s.lead).toBeNull();
    expect(s.stories).toEqual([]);
    expect(s.sidebar.map((x) => x.name)).toEqual(['Full', 'Plain']);
  });
});
