import { describe, expect, it } from 'vitest';
import { wpEvent, wpId, wpValue, type WpEventRow } from '@/lib/agents/wordpress';

const row: WpEventRow = {
  id: '20206fa8-c57c-4408-a612-50a461a5b1d9', slug: 'winter-domes-2026', title: 'Winter Domes at Grand Jersey',
  summary: 'Heated dining domes on the terrace.', description: 'First paragraph.\n\nSecond & last.', guideCopy: null,
  venue: null, venueName: 'Grand Jersey Hotel & Spa', addressLine1: 'The Esplanade', parish: 'St Helier', postcode: 'JE2 3QA',
  phone: '+44 (0) 1534 722301', email: 'hello@example.je', website: 'https://example.je/domes', eventTypes: ['Food & drink', 'Seasonal', 'Business & networking'],
  free: false, lat: 49.18, lon: -2.11, dates: [{ date: '2026-12-01', start: '12:00', end: '22:00' }, { date: '2026-11-27', start: '12:00', end: '22:00' }],
  fromPricePence: 10000, toPricePence: null,
  headerImage: { url: 'https://cdn.jersey.com/a.jpg', publicId: 'a', alt: 'Domes', originalFilename: 'a' },
  gallery: [{ url: 'https://images.example/stock.jpg', publicId: null, alt: null, originalFilename: null, credit: { name: 'X', url: null, source: 'Openverse' } }],
  sourceLink: 'https://www.jersey.com/things-to-do/events/listings/winter-domes/', organiser: 'Grand Jersey Hotel',
  createdAt: new Date('2026-10-01T09:00:00Z'), updatedAt: new Date('2026-11-10T12:30:00Z'),
};

describe('our events as jersey.com WordPress posts', () => {
  const post = wpEvent(row, { sources: ['visit_jersey', 'eventbrite'], jerseyComId: '13304' });

  it('carries the post fields a WordPress client reads', () => {
    expect(post).toMatchObject({ id: wpId(row.id), slug: 'winter-domes-2026', type: 'events', status: 'publish', lang: 'en', link: 'https://guide.je/whats-on/winter-domes-2026', modified_gmt: '2026-11-10T12:30:00' });
    expect(post.title.rendered).toBe('Winter Domes at Grand Jersey');
    expect(Number.isSafeInteger(post.id)).toBe(true);
  });

  it('fills their ACF fields as they spell them', () => {
    expect(post.acf.event_dates).toEqual([{ date: '20261127', start_time: '12:00', end_time: '22:00' }, { date: '20261201', start_time: '12:00', end_time: '22:00' }]);
    expect(post.acf.event_dates_start).toBe('27/11/2026');
    expect(post.acf.event_dates_end).toBe('01/12/2026');
    expect(post.acf.type).toEqual([{ label: 'Food & drink', value: 'food-drink' }, { label: 'Seasonal', value: 'seasonal' }]);
    expect(post.acf.parish).toEqual({ label: 'St Helier', value: 'st-helier' });
    expect(post.acf.address).toEqual({ place_name: 'Grand Jersey Hotel & Spa', address_line_1: 'The Esplanade', address_line_2: 'Jersey', postcode: 'JE2 3QA' });
    expect(post.acf.from_price).toBe('100');
    expect(post.acf.seasonality.map((s) => s.value)).toEqual(['november', 'december']);
    expect(post.acf.long_description).toBe('<p>First paragraph.</p>\n<p>Second &amp; last.</p>\n');
    expect(post.acf.map_location_lat).toBe('49.18');
  });

  it('passes on their own pictures but not our stock ones, and says where it came from', () => {
    expect(JSON.parse(post.acf.header_image_data)).toEqual([{ url: 'https://cdn.jersey.com/a.jpg', public_id: 'a', alt_text: 'Domes', original_filename: 'a' }]);
    expect(post.acf.gallery_images_data).toBe('');
    expect(post.acf.guide_sources).toEqual(['jersey.com', 'Eventbrite']);
    expect(post.acf.jersey_com_id).toBe(13304);
  });

  it('calls a free event free', () => {
    const free = wpEvent({ ...row, free: true });
    expect(free.acf.from_price).toBe('0');
    expect(free.acf.booking_information).toEqual([{ label: 'Free entry', value: 'free-entry' }]);
    expect(free.acf.jersey_com_id).toBeNull();
  });

  it('spells values as theirs are', () => {
    expect(wpValue('Arts & cultural')).toBe('arts-cultural');
    expect(wpValue('St. Brelade')).toBe('st-brelade');
  });
});
