import { describe, expect, it } from 'vitest';
import { heroPicks, imageKey, isFestival } from '@/lib/domain/hero';
import type { Image } from '@/lib/db/schema';
import type { Occurrence } from '@/lib/domain/occurrence';

const img = (name: string, publicId: string | null = name): Image => ({
  url: `https://res.cloudinary.com/x/image/upload/v1/${name}.jpg`,
  publicId,
  alt: null,
  originalFilename: null,
});

const ev = (title: string, o: { highlight?: boolean; occurrence?: Occurrence; eventTypes?: string[]; image?: Image | null } = {}) => ({
  title,
  highlight: o.highlight ?? false,
  occurrence: o.occurrence ?? 'one-off',
  eventTypes: o.eventTypes ?? [],
  headerImage: o.image === undefined ? img(title) : o.image,
});

const titles = (rows: ReturnType<typeof ev>[]) => rows.map((r) => r.title);

describe('isFestival', () => {
  it('knows a festival by its title or its type', () => {
    expect(isFestival({ title: 'Jersey Festival of Words', eventTypes: [] })).toBe(true);
    expect(isFestival({ title: 'Weekender', eventTypes: ['Festivals'] })).toBe(true);
    expect(isFestival({ title: 'Quiz night', eventTypes: ['Music'] })).toBe(false);
  });
});

describe('imageKey', () => {
  it('uses the Cloudinary id, else the URL without its query', () => {
    expect(imageKey(img('a'))).toBe('a');
    expect(imageKey({ ...img('a', null), url: 'https://e.com/a.jpg?w=1' })).toBe('https://e.com/a.jpg');
  });
});

describe('heroPicks', () => {
  it('puts highlights first, then festivals, then other unique events, each in date order', () => {
    const rows = [
      ev('Quiz'),
      ev('Food Festival', { eventTypes: ['Food & drink'] }),
      ev('Battle of Flowers', { highlight: true }),
      ev('Gig'),
      ev('Air Display', { highlight: true }),
    ];
    expect(titles(heroPicks(rows, (r) => r))).toEqual(['Battle of Flowers', 'Air Display', 'Food Festival', 'Quiz', 'Gig']);
  });

  it('never uses the same photo twice', () => {
    const shared = img('poster');
    const rows = [
      ev('Night one', { highlight: true, image: shared }),
      ev('Night two', { highlight: true, image: { ...shared, alt: 'Same poster' } }),
      ev('Other'),
    ];
    expect(titles(heroPicks(rows, (r) => r))).toEqual(['Night one', 'Other']);
  });

  it('leaves out events with no photo, ongoing ones not highlighted, and stops at the limit', () => {
    const rows = [ev('No photo', { highlight: true, image: null }), ev('Exhibition', { occurrence: 'ongoing' }), ev('A'), ev('B'), ev('C')];
    expect(titles(heroPicks(rows, (r) => r, 2))).toEqual(['A', 'B']);
    expect(heroPicks([], (r) => r)).toEqual([]);
  });
});
