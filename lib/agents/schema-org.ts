import { SITE, SITE_ABOUT, type EventOut, type TourOut } from '@/lib/agents/data';

/**
 * schema.org descriptions of the site and its listings, from the same
 * fields the API gives, so what search engines read and what agents get
 * from the API never disagree.
 */

const ORG_ID = `${SITE}/#organization`;

export const organisation = () => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: 'Visitor',
      alternateName: ['Visitor.je', 'Visit Jersey Visitor Guide', 'Jersey Visitor Guide'],
      url: SITE,
      logo: `${SITE}/visitor-logo.svg`,
      description: SITE_ABOUT,
      email: 'hello@visitor.je',
      areaServed: { '@type': 'Place', name: 'Jersey, Channel Islands' },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      name: 'Visitor: Jersey’s What’s On Guide',
      url: SITE,
      inLanguage: 'en-GB',
      publisher: { '@id': ORG_ID },
      potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/whats-on?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
    },
  ],
});

export const breadcrumbs = (trail: [name: string, path: string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [['Home', '/'] as [string, string], ...trail].map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}${path === '/' ? '' : path}` })),
});

const place = (name: string | null, address: string | null, parish: string | null, lat: number | null, lon: number | null, url?: string | null) =>
  name || address
    ? {
        '@type': 'Place',
        name: name ?? address,
        ...(url ? { url } : {}),
        address: { '@type': 'PostalAddress', streetAddress: address ?? undefined, addressLocality: parish ?? undefined, addressRegion: 'Jersey', addressCountry: 'JE' },
        ...(lat !== null && lon !== null ? { geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lon } } : {}),
      }
    : undefined;

const offer = (from: number | null, to: number | null, free: boolean, url: string | null) =>
  free
    ? { '@type': 'Offer', price: '0', priceCurrency: 'GBP', url: url ?? undefined }
    : from !== null
      ? { '@type': 'AggregateOffer', lowPrice: (from / 100).toFixed(2), highPrice: ((to ?? from) / 100).toFixed(2), priceCurrency: 'GBP', url: url ?? undefined }
      : undefined;

const startOf = (d: { date: string; start: string | null } | undefined) => (d ? (d.start ? `${d.date}T${d.start}` : d.date) : undefined);

export const eventLd = (e: EventOut) => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  '@id': `${e.url}#event`,
  name: e.title,
  url: e.url,
  description: e.summary ?? e.description?.slice(0, 500) ?? undefined,
  startDate: startOf(e.dates[0]) ?? e.next ?? undefined,
  endDate: e.dates.at(-1) ? (e.dates.at(-1)!.end ? `${e.dates.at(-1)!.date}T${e.dates.at(-1)!.end}` : e.dates.at(-1)!.date) : undefined,
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  ...(e.dates.length > 1 && e.dates.length <= 60
    ? { eventSchedule: e.dates.map((d) => ({ '@type': 'Schedule', startDate: d.date, startTime: d.start ?? undefined, endTime: d.end ?? undefined, scheduleTimezone: 'Europe/Jersey' })) }
    : {}),
  image: e.image ? [e.image] : undefined,
  location: place(e.venue, e.address, e.parish, e.lat, e.lon, e.venueUrl),
  organizer: e.organiser ? { '@type': 'Organization', name: e.organiser } : undefined,
  isAccessibleForFree: e.free || undefined,
  offers: offer(e.fromPricePence, e.toPricePence, e.free, e.tickets),
  keywords: e.kinds.length ? e.kinds.join(', ') : undefined,
  publisher: { '@id': ORG_ID },
});

export const tourLd = (t: TourOut) => ({
  '@context': 'https://schema.org',
  '@type': 'TouristTrip',
  '@id': `${t.url}#trip`,
  name: t.title,
  url: t.url,
  description: t.summary ?? t.description?.slice(0, 500) ?? undefined,
  image: t.image ? [t.image] : undefined,
  touristType: t.kind ?? undefined,
  provider: t.runBy ? { '@type': 'Organization', name: t.runBy, url: t.book ?? undefined } : undefined,
  itinerary: t.meetingPoint ? place(t.meetingPoint, null, t.parish, t.lat, t.lon) : undefined,
  offers: offer(t.fromPricePence, t.toPricePence, false, t.book),
  publisher: { '@id': ORG_ID },
});

export const venueLd = (v: { name: string; url: string; summary: string | null; address: string | null; parish: string | null; lat: number | null; lon: number | null; website: string | null; phone: string | null; image: string | null }, events: EventOut[]) => ({
  '@context': 'https://schema.org',
  ...place(v.name, v.address, v.parish, v.lat, v.lon, v.url),
  '@type': 'Place',
  '@id': `${v.url}#place`,
  description: v.summary ?? undefined,
  sameAs: v.website ? [v.website] : undefined,
  telephone: v.phone ?? undefined,
  image: v.image ?? undefined,
  event: events.slice(0, 20).map((e) => ({ '@type': 'Event', name: e.title, url: e.url, startDate: startOf(e.dates[0]) ?? e.next ?? undefined })),
});

export const itemList = (name: string, urls: string[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  numberOfItems: urls.length,
  itemListElement: urls.slice(0, 100).map((url, i) => ({ '@type': 'ListItem', position: i + 1, url })),
});
