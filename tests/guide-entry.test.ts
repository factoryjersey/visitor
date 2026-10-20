import { describe, expect, it } from 'vitest';
import type { Event, Experience } from '@/lib/db/schema';
import { toCsv, utf16le } from '@/lib/domain/csv';
import { guideEvent, guideTour, layoutEvents, type GuideEvent } from '@/lib/domain/guide-entry';

const base: Event = {
  id: 'e', slug: 'meet-albert', title: 'Meet Albert: The Retired Gunner',
  summary: 'Step into the past and meet Albert.', description: null, guideCopy: null,
  venue: 'Elizabeth Castle, St Aubin’s Bay, St Helier', venueName: 'Elizabeth Castle',
  addressLine1: 'St Aubin’s Bay', parish: 'St Helier', postcode: null,
  phone: '+44 (0) 1534 633300', email: 'info@jerseyheritage.org', website: 'https://www.jerseyheritage.org',
  eventTypes: [], free: false, occurrence: 'ongoing', placeId: null, lat: null, lon: null,
  dates: Array.from({ length: 59 }, (_, i) => ({ date: new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10), start: '10:00', end: '16:00' })),
  startsOn: '2026-09-01', endsOn: '2026-10-29', fromPricePence: 1145, toPricePence: 2450,
  printDates: null, printTimes: null, printPrice: null, printLine: null, printLineKey: null, highlight: false,
  headerImage: null, sourceLink: null, organiser: null, businessId: null, review: 'approved', reviewNote: null, inclusion: 'included', inclusionNote: null,
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

describe('guideWebsite', () => {
  it('prints the venue’s own site over a ticket platform', async () => {
    const { guideWebsite } = await import('@/lib/domain/guide-entry');
    expect(guideWebsite('https://www.eventbrite.co.uk/e/quiz-123', 'https://www.ommaroo.com')).toBe('https://www.ommaroo.com');
    expect(guideWebsite('https://jerseyoperahouse.ticketsolve.com/shows/1', 'https://www.jerseyoperahouse.co.uk')).toBe('https://www.jerseyoperahouse.co.uk');
    expect(guideWebsite('https://www.eventbrite.co.uk/e/quiz-123', null)).toBe('https://www.eventbrite.co.uk/e/quiz-123');
    expect(guideWebsite('https://www.ommaroo.com/music', 'https://www.ommaroo.com')).toBe('https://www.ommaroo.com/music');
  });
});

describe('fitting copy to its printed frame', () => {
  it('keeps whole sentences that fit, and cuts a single long one at a word', async () => {
    const { fitCopy } = await import('@/lib/domain/guide-entry');
    expect(fitCopy('First one. Second one is longer. Third.', 30)).toBe('First one.');
    expect(fitCopy('First one. Second one is longer. Third.', 40)).toBe('First one. Second one is longer. Third.');
    expect(fitCopy('Short.', 30)).toBe('Short.');
    expect(fitCopy('An extremely long single sentence that never stops going on and on', 30)).toBe('An extremely long single…');
  });

  it('leaves less room for copy when the title and address run long', async () => {
    const { copyBudget } = await import('@/lib/domain/guide-entry');
    const base = { dates: '1 NOV', times: '', title: 'Quiz', price: '', venue: 'Hall', address: '', contact: '', website: 'X.JE' };
    const roomy = copyBudget(base);
    const tight = copyBudget({ ...base, title: 'A very long title that runs onto two or three lines in the frame', address: 'La Route de la Haule, St. Lawrence, JE3 1AB, Jersey', contact: '+44 (0) 1534 000000' });
    expect(tight).toBeLessThan(roomy);
    expect(roomy).toBeGreaterThan(300);
  });

  it('prints the fullest copy that fits in whole sentences, the short version when nothing longer does', async () => {
    const { printCopy } = await import('@/lib/domain/guide-entry');
    const description = 'The museum tells the story of the island. It has three floors of exhibits. A café looks over the harbour.';
    expect(printCopy({ guideCopy: null, summary: 'A museum of island life.', description }, 80)).toBe('The museum tells the story of the island. It has three floors of exhibits.');
    const run = 'An unbroken sentence that goes on for far longer than any frame could ever hold without a stop';
    expect(printCopy({ guideCopy: null, summary: 'A museum of island life.', description: run }, 70)).toBe('A museum of island life.');
    expect(printCopy({ guideCopy: 'Ours, for print.', summary: 'Theirs.', description }, 70)).toBe('Ours, for print.');
  });
});

describe('events six to a page', () => {
  const ev = (title: string, opts: { image?: boolean; community?: boolean } = {}) =>
    ({ title, imageUrl: opts.image ? `https://x/${title}.jpg` : '', community: !!opts.community, fits: { picture: `${title} short`, listing: `${title} long` }, frame: 'listing', copy: '' }) as unknown as GuideEvent;

  it('puts two pictured events across the top, a community one only when nothing else has a picture', () => {
    const page = [ev('a'), ev('b', { image: true, community: true }), ev('c', { image: true }), ev('d'), ev('e', { image: true }), ev('f'), ev('g', { image: true })];
    const pages = layoutEvents(page);
    expect(pages.map((p) => p.length)).toEqual([6, 1]);
    expect(pages[0]!.map((e) => `${e.title}:${e.frame}`)).toEqual(['c:picture', 'e:picture', 'a:listing', 'b:listing', 'd:listing', 'f:listing']);
    expect(pages[0]![0]!.copy).toBe('c short');
    expect(pages[0]![2]!.copy).toBe('a long');
    expect(layoutEvents([ev('x'), ev('y', { image: true, community: true })])[0]!.map((e) => e.frame)).toEqual(['picture', 'listing']);
  });
});

describe('the guide line', () => {
  it('prints in a small frame when nothing longer fits whole, and nothing rather than a stub', async () => {
    const { printCopy } = await import('@/lib/domain/guide-entry');
    const long = 'An evening of chamber music by candlelight in the old parish church, with mulled wine served in the interval.';
    const line = 'Chamber music by candlelight in the parish church.';
    expect(printCopy({ guideCopy: null, summary: long, description: null, printLine: line }, 70)).toBe(line);
    expect(printCopy({ guideCopy: null, summary: long, description: null }, 40)).toBe('');
    expect(printCopy({ guideCopy: null, summary: long, description: null, printLine: line }, 0)).toBe('');
  });
});

describe('pictures in print', () => {
  const photo = { url: 'https://res.cloudinary.com/x/image/upload/a.jpg', publicId: null, alt: null, originalFilename: null };
  it('prints the listing’s own photograph, but not a poster or flyer', () => {
    expect(guideEvent({ ...base, headerImage: photo }, null)?.imageUrl).toBe(photo.url);
    expect(guideEvent({ ...base, headerImage: { ...photo, text: { found: true, url: photo.url, at: '2026-10-20' } } }, null)?.imageUrl).toBe('');
    // A check made for an earlier picture says nothing about this one.
    expect(guideEvent({ ...base, headerImage: { ...photo, text: { found: true, url: 'https://old/b.jpg', at: '2026-10-20' } } }, null)?.imageUrl).toBe(photo.url);
  });
});
