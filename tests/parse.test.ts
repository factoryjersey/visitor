import { describe, expect, it } from 'vitest';
import fixture from './fixtures/visit-jersey-listings.json';
import type { RawItem } from '@/lib/integrations/jersey-com/directory';
import { htmlToText, images, months, pence, toEvent, toPlace, utc } from '@/lib/integrations/jersey-com/parse';

const acc = fixture.accommodation as RawItem[];
const food = fixture['food-and-drink'] as RawItem[];

describe('toPlace', () => {
  const hotel = toPlace(acc[0]!, 'accommodation');

  it('decodes the title and tidies the parish', () => {
    expect(hotel.name).toBe('Sample Harbour Hotel & Kitchen');
    expect(hotel.parish).toBe('St Brelade');
    expect(hotel.category).toBe('stay');
  });

  it('keeps a second address line that is a village, uppercases the postcode', () => {
    expect(hotel.addressLine2).toBe('St. Aubin');
    expect(hotel.postcode).toBe('JE3 8AB');
  });

  it('drops a second line that only repeats the parish', () => {
    expect(toPlace(food[0]!, 'food-and-drink').addressLine2).toBeNull();
  });

  it('drops a second line that only says Jersey', () => {
    expect(toPlace(acc[1]!, 'accommodation').addressLine2).toBeNull();
  });

  it('reads rates as pence, months open, labels and images', () => {
    expect(hotel.lowRatePence).toBe(13500);
    expect(hotel.highRatePence).toBe(29500);
    expect(hotel.openMonths).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    expect(hotel.facilities).toEqual(['Free WiFi', 'Parking']);
    expect(hotel.aaRating).toBe('4 Star');
    expect(hotel.headerImage?.originalFilename).toBe('DSC00001-scaled');
    expect(hotel.headerImage?.alt).toBeNull();
    expect(hotel.gallery).toHaveLength(1);
  });

  it('strips a trailing ", Jersey" and ignores "Not Applicable"', () => {
    const p = toPlace({ id: 1, title: { rendered: 'X' }, acf: {
      address: { address_line_1: 'Main Road', address_line_2: 'Gorey, Jersey' },
      parish: { label: 'Grouville' },
      accessibility: [{ value: 'Not Applicable', label: 'Not Applicable' }],
    } }, 'accommodation');
    expect(p.addressLine2).toBe('Gorey');
    expect(p.accessibility).toEqual([]);
  });

  it('reads modified_gmt as UTC', () => {
    expect(hotel.modifiedAt?.toISOString()).toBe('2026-03-04T09:12:00.000Z');
  });

  it('rejects a pin outside Jersey rather than keeping it', () => {
    const p = toPlace(food[2]!, 'food-and-drink');
    expect(p.lat).toBeNull();
    expect(p.lon).toBeNull();
    expect(p.name).toBe('Sample Unpinned Café');
  });
});

describe('toEvent', () => {
  it('reads dates, venue and prices', () => {
    const e = toEvent(fixture.events[0] as RawItem);
    expect(e.dates).toEqual([{ date: '2026-12-31', start: '19:00', end: '01:00' }]);
    expect(e.startsOn).toBe('2026-12-31');
    expect(e.venue).toBe('Example Hall, St Helier');
    expect(e.fromPricePence).toBe(2500);
    expect(e.toPricePence).toBe(4000);
  });
});

describe('field readers', () => {
  it('turns HTML copy into paragraphs', () => {
    expect(htmlToText('<p>One &amp; two</p><p>Three<br>four</p>')).toBe('One & two\n\nThree\nfour');
    expect(htmlToText('<p></p>')).toBeNull();
    expect(htmlToText(undefined)).toBeNull();
  });

  it('survives a malformed image string', () => {
    expect(images('{not json')).toEqual([]);
  });

  it('reads months from value when the label is missing', () => {
    expect(months([{ value: 'december' }, { value: 'jan' }])).toEqual([1, 12]);
  });

  it('reads rates written as text and ignores zero', () => {
    expect(pence('£1,200')).toBe(120000);
    expect(pence(0)).toBeNull();
  });

  it('keeps an explicit zone', () => {
    expect(utc('2026-01-01T00:00:00+01:00')?.toISOString()).toBe('2025-12-31T23:00:00.000Z');
  });
});
