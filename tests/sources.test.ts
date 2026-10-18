import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { eventDates, eventbriteId, ldEvents, localTime, toEvent, type LdEvent } from '@/lib/integrations/eventbrite/parse';
import { FEEDS, parseShows } from '@/lib/integrations/ticketsolve/parse';

describe('Ticketsolve', () => {
  const shows = parseShows(readFileSync('tests/fixtures/ticketsolve-shows.xml', 'utf8'), FEEDS[0]!);

  it('reads a show with its performances, in date order, without the cancelled ones', () => {
    const evan = shows.find((s) => s.title === 'Dear Evan Hansen')!;
    expect(evan.dates).toEqual([
      { date: '2026-11-19', start: '19:30', end: null },
      { date: '2026-11-20', start: '19:30', end: null },
    ]);
    expect(evan.venueName).toBe('Jersey Arts Centre');
    expect(evan.postcode).toBe('JE2 4SW');
    expect(evan.eventTypes).toEqual(['Arts & cultural']);
    expect(evan.website).toBe('https://artscentre.ticketsolve.com/shows/900000001');
    expect(evan.occurrence).toBe('one-off');
  });

  it('keeps an off-site show without inventing a venue', () => {
    const talk = shows.find((s) => s.externalId === '873689085')!;
    expect(talk.title).toBe('G&S Festival: A talk on G&S');
    expect(talk.venueName).toBeNull();
    expect(talk.summary).toBe('This year Jersey will have its very own “Gilbert and Sullivan Festival”.');
    expect(talk.headerImage?.url).toBe('https://d235gwso45fsgz.cloudfront.net/as-assets/large');
    expect(talk.eventTypes).toEqual(['Music']);
  });

  it('leaves out a cancelled show', () => {
    expect(shows.map((s) => s.title)).not.toContain('Cancelled Show');
  });
});

describe('Eventbrite', () => {
  // As the Jersey listing page gives it, and as the event's own page does.
  const listing: LdEvent = {
    '@type': 'Event',
    name: "80's and 90's Disco Night",
    startDate: '2026-11-07',
    endDate: '2026-11-08',
    url: 'https://www.eventbrite.co.uk/e/80s-and-90s-disco-night-tickets-1994783414892',
    description: 'Join DJ Mel for the ultimate 80s & 90s disco night, in support of JCH',
    image: 'https://img.evbuc.com/x.jpg',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: 'The Best Western Royal Hotel',
      geo: { latitude: '49.1889148', longitude: '-2.1028887' },
      address: { postalCode: 'JE2 4TD', addressLocality: 'Saint Helier', addressRegion: 'St Helier', streetAddress: 'David Place', addressCountry: 'JE' },
    },
  };
  const page: LdEvent = {
    '@type': 'SocialEvent',
    startDate: '2026-11-07T19:30:00Z',
    endDate: '2026-11-08T01:00:00Z',
    offers: [{ lowPrice: '33.22', highPrice: '33.22' }],
    location: { ...listing.location, address: { ...listing.location!.address, streetAddress: 'David Place, JE2 4TD Saint Helier' } },
  };

  it('finds Events in a page’s JSON-LD', () => {
    const html = `<script type="application/ld+json">{"@context":"https://schema.org","itemListElement":[{"item":${JSON.stringify(listing)}}]}</script>`;
    expect(ldEvents(html).map((e) => e.name)).toEqual(["80's and 90's Disco Night"]);
  });

  it('reads Jersey time, summer and winter', () => {
    expect(localTime('2026-07-01T18:00:00Z')).toEqual({ date: '2026-07-01', time: '19:00' });
    expect(localTime('2026-11-07T19:30:00Z')).toEqual({ date: '2026-11-07', time: '19:30' });
    expect(localTime('2026-11-07')).toEqual({ date: '2026-11-07', time: null });
  });

  it('calls a late night one date, and a week-long camp five', () => {
    expect(eventDates('2026-11-07T19:30:00Z', '2026-11-08T01:00:00Z')).toEqual([{ date: '2026-11-07', start: '19:30', end: '01:00' }]);
    expect(eventDates('2026-10-26T09:00:00Z', '2026-10-30T15:00:00Z').map((d) => d.date)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']);
  });

  it('reads an event from its listing and page', () => {
    const e = toEvent(listing, page)!;
    expect(e).toMatchObject({
      externalId: '1994783414892',
      title: "80's and 90's Disco Night",
      venueName: 'The Best Western Royal Hotel',
      addressLine1: 'David Place',
      parish: 'St Helier',
      postcode: 'JE2 4TD',
      dates: [{ date: '2026-11-07', start: '19:30', end: '01:00' }],
      fromPricePence: 3322,
      toPricePence: null,
      free: false,
      lat: 49.1889148,
    });
    expect(eventbriteId(e.website!)).toBe('1994783414892');
  });

  it('does without the page: the day, no time', () => {
    expect(toEvent(listing, null)!.dates).toEqual([{ date: '2026-11-07', start: null, end: null }]);
  });

  it('leaves out events elsewhere, online or cancelled', () => {
    expect(toEvent({ ...listing, location: { ...listing.location, address: { postalCode: 'GY1 1AA', addressCountry: 'GG' } } }, null)).toBeNull();
    expect(toEvent({ ...listing, eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode' }, null)).toBeNull();
    expect(toEvent(listing, { ...page, eventStatus: 'https://schema.org/EventCancelled' })).toBeNull();
  });

  it('calls a free event free', () => {
    expect(toEvent(listing, { ...page, offers: [{ lowPrice: '0.00', highPrice: '0.00' }] })).toMatchObject({ free: true, fromPricePence: null });
  });
});
