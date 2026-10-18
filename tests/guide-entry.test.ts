import { describe, expect, it } from 'vitest';
import type { Event, Experience } from '@/lib/db/schema';
import { toCsv, utf16le } from '@/lib/domain/csv';
import { guideEvent, guideTour } from '@/lib/domain/guide-entry';

const base: Event = {
  id: 'e', slug: 'meet-albert', title: 'Meet Albert: The Retired Gunner',
  summary: 'Step into the past and meet Albert.', description: null, guideCopy: null,
  venue: 'Elizabeth Castle, St Aubin’s Bay, St Helier', venueName: 'Elizabeth Castle',
  addressLine1: 'St Aubin’s Bay', parish: 'St Helier', postcode: null,
  phone: '+44 (0) 1534 633300', email: 'info@jerseyheritage.org', website: 'https://www.jerseyheritage.org',
  eventTypes: [], free: false, occurrence: 'ongoing', placeId: null, lat: null, lon: null,
  dates: Array.from({ length: 59 }, (_, i) => ({ date: new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10), start: '10:00', end: '16:00' })),
  startsOn: '2026-09-01', endsOn: '2026-10-29', fromPricePence: 1145, toPricePence: 2450,
  printDates: null, printTimes: null, printPrice: null, highlight: false,
  headerImage: null, sourceLink: null, businessId: null, review: 'approved', reviewNote: null, inclusion: 'included', inclusionNote: null,
  inclusionSetBy: null, inclusionSetAt: null, editedBy: null, editedAt: null,
  fieldSources: {}, lockedFields: [], sourceModifiedAt: null, createdAt: new Date(), updatedAt: new Date(),
};

describe('guideEvent', () => {
  it('reads like the printed entry', () => {
    expect(guideEvent(base, null, { from: '2026-09-01', to: '2026-11-30' })).toMatchObject({
      dates: '1 SEP UNTIL 29 OCT',
      times: '10:00-16:00',
      title: 'Meet Albert: The Retired Gunner',
      copy: 'Step into the past and meet Albert.',
      price: '£11.45 - £24.50',
      venue: 'Elizabeth Castle',
      address: 'St Aubin’s Bay, St. Helier',
      contact: '+44 (0) 1534 633300',
      website: 'JERSEYHERITAGE.ORG',
    });
  });

  it('prefers our copy and our overrides', () => {
    const g = guideEvent({ ...base, guideCopy: 'Ours.', printDates: 'Every day until 29 Oct', printPrice: 'Castle admission' }, null);
    expect(g).toMatchObject({ copy: 'Ours.', dates: 'Every day until 29 Oct', price: 'Castle admission' });
  });

  it('leaves out an event not on during the edition', () => {
    expect(guideEvent(base, null, { from: '2027-01-01', to: '2027-03-31' })).toBeNull();
  });
});

describe('csv', () => {
  it('quotes commas and quotes, flattens line breaks', () => {
    expect(toCsv(['A', 'B'], [['a, b', 'say "hi"\n\nthere']])).toBe('A,B\r\n"a, b","say ""hi"" there"\r\n');
  });

  it('writes UTF-16LE with a byte-order mark', () => {
    expect([...utf16le('’')]).toEqual([0xff, 0xfe, 0x19, 0x20]);
  });
});


const tour: Experience = {
  id: 't', slug: 'beach-blokarting', title: 'Beach Blokarting', providerId: null,
  summary: 'Think go-karting meets sailing.', description: null, guideCopy: null,
  duration: '1-2 hrs', tags: [], genre: 'Active',
  dates: ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06'].map((date) => ({ date, start: null, end: null })),
  occurrence: 'dates', fromPricePence: null, toPricePence: null, meetingPoint: null, parish: null,
  phone: null, email: null, website: null, lat: null, lon: null, printDates: null, printTimes: null, highlight: false,
  headerImage: null, sourceLink: null, businessId: null, review: 'approved', reviewNote: null, inclusion: 'included', inclusionNote: null, inclusionSetBy: null,
  inclusionSetAt: null, editedBy: null, editedAt: null, fieldSources: {}, lockedFields: [], sourceModifiedAt: null,
  createdAt: new Date(), updatedAt: new Date(),
};

describe('guideTour', () => {
  it('prints a dated tour with its dates and provider code', () => {
    expect(guideTour(tour, { name: 'Absolute Adventures', code: 'AA' })).toMatchObject({
      kind: 'dated', dates: '1/8/15/22/29 Sep, 6 Oct', title: 'Beach Blokarting', code: 'AA', duration: '1-2 hrs',
    });
  });

  it('prints an on-demand tour under its genre, without dates', () => {
    const daily = { ...tour, occurrence: 'ongoing' as const, dates: tour.dates.map((d, i) => ({ ...d, start: `${9 + i}:00` })) };
    expect(guideTour(daily, { name: 'VAC', code: 'VAC' }, { from: '2026-09-01', to: '2026-11-30' })).toMatchObject({
      kind: 'on demand', genre: 'Active', dates: '', times: '',
    });
  });

  it('leaves out a dated tour with nothing in the edition', () => {
    expect(guideTour(tour, null, { from: '2027-01-01', to: '2027-03-31' })).toBeNull();
  });
});
