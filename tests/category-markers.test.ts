import { describe, expect, it } from 'vitest';
import { markersFor } from '@/components/site/category-markers';

const names = (types: string[]) => markersFor(types).map(([t]) => t);

describe('markersFor', () => {
  it('shows the most telling kinds first, three at most', () => {
    expect(names(['Health & wellbeing', 'Sports', 'Outdoor', 'Spectator', 'Participant'])).toEqual(['Sports', 'Outdoor', 'Health & wellbeing']);
    expect(names(['Seasonal', 'Charity', 'Music', 'Festivals', 'Food & drink'])).toEqual(['Festivals', 'Music', 'Charity']);
  });
  it('has nothing for the kinds a visitor cannot use at a glance', () => {
    expect(names(['Spectator', 'Participant', 'Business & networking'])).toEqual([]);
  });
});
