import { SITE, SITE_ABOUT } from '@/lib/agents/data';
import { EVENT_TYPES } from '@/lib/domain/categorise';
import { GENRES } from '@/lib/domain/genre';

/** The public API described for programs (OpenAPI 3.1). */
export function openApi() {
  const str = { type: 'string' };
  const nstr = { type: ['string', 'null'] };
  const nint = { type: ['integer', 'null'] };
  const nnum = { type: ['number', 'null'] };
  const event = {
    type: 'object',
    properties: {
      slug: str, url: { ...str, format: 'uri' }, title: str, summary: nstr, description: nstr,
      kinds: { type: 'array', items: str }, when: { ...nstr, description: 'The dates in words, as the guide prints them' },
      next: { ...nstr, format: 'date' },
      dates: { type: 'array', items: { type: 'object', properties: { date: { ...str, format: 'date' }, start: nstr, end: nstr } } },
      occurrence: { enum: ['one-off', 'dates', 'regular', 'ongoing'] },
      venue: nstr, venueUrl: nstr, parish: nstr, address: nstr,
      price: { ...nstr, description: 'In words, e.g. "£12–£18" or "Free"' }, free: { type: 'boolean' }, fromPricePence: nint, toPricePence: nint,
      organiser: nstr, tickets: { ...nstr, description: 'Where to book or read more' }, image: nstr, lat: nnum, lon: nnum,
    },
  };
  const tour = {
    type: 'object',
    properties: {
      slug: str, url: str, title: str, summary: nstr, description: nstr, kind: { ...nstr, enum: [...GENRES, null] }, when: nstr, next: nstr,
      occurrence: str, bookableAnyDay: { type: 'boolean' }, duration: nstr, meetingPoint: nstr, parish: nstr, price: nstr,
      fromPricePence: nint, toPricePence: nint, runBy: nstr, book: nstr, image: nstr, lat: nnum, lon: nnum,
    },
  };
  const venue = { type: 'object', properties: { slug: str, url: str, name: str, summary: nstr, parish: nstr, upcomingEvents: { type: 'integer' } } };
  const notFound = { description: 'Not on the site', content: { 'application/json': { schema: { type: 'object', properties: { error: str } } } } };
  const ok = (schema: object, description: string) => ({ description, content: { 'application/json': { schema } } });
  const q = (name: string, description: string, schema: object = str) => ({ name, in: 'query', required: false, description, schema });
  const slug = { name: 'slug', in: 'path', required: true, schema: str };
  return {
    openapi: '3.1.0',
    info: {
      title: 'Visitor: Jersey’s What’s On Guide API',
      version: '1.0.0',
      description: `${SITE_ABOUT}\n\nRead-only, free, no key. Dates are in Jersey time (Europe/Jersey), prices in pence sterling. Please link to the listing's url when you show it.`,
      contact: { name: 'Visitor', url: SITE, email: 'hello@visitor.je' },
    },
    servers: [{ url: `${SITE}/api/v1` }],
    externalDocs: { url: `${SITE}/llms.txt` },
    paths: {
      '/events': {
        get: {
          operationId: 'searchEvents',
          summary: 'Search events coming up in Jersey',
          parameters: [
            q('q', 'Words in the title or venue'),
            q('from', 'First day, YYYY-MM-DD (default today)', { ...str, format: 'date' }),
            q('to', 'Last day, YYYY-MM-DD', { ...str, format: 'date' }),
            q('kind', 'A kind of event', { enum: EVENT_TYPES.filter((t) => t !== 'Business & networking') }),
            q('venue', 'A venue slug, or words in its name'),
            q('ongoing', 'Include exhibitions, daily attractions and weekly sessions', { enum: ['1', '0'] }),
            q('limit', 'At most this many (1–200, default 50)', { type: 'integer' }),
          ],
          responses: { 200: ok({ type: 'object', properties: { total: { type: 'integer' }, events: { type: 'array', items: { $ref: '#/components/schemas/Event' } } } }, 'Events, soonest first') },
        },
      },
      '/events/{slug}': { get: { operationId: 'getEvent', summary: 'One event', parameters: [slug], responses: { 200: ok({ $ref: '#/components/schemas/Event' }, 'The event'), 404: notFound } } },
      '/tours': {
        get: {
          operationId: 'searchTours',
          summary: 'Search tours and experiences in Jersey',
          parameters: [q('q', 'Words in the title or operator'), q('kind', 'A kind of tour', { enum: GENRES }), q('anyday', 'Include tours bookable any day (default 1)', { enum: ['1', '0'] }), q('limit', 'At most this many', { type: 'integer' })],
          responses: { 200: ok({ type: 'object', properties: { total: { type: 'integer' }, tours: { type: 'array', items: { $ref: '#/components/schemas/Tour' } } } }, 'Tours, dated ones by their next date first') },
        },
      },
      '/tours/{slug}': { get: { operationId: 'getTour', summary: 'One tour or experience', parameters: [slug], responses: { 200: ok({ $ref: '#/components/schemas/Tour' }, 'The tour'), 404: notFound } } },
      '/venues': { get: { operationId: 'listVenues', summary: 'Venues with events coming up', responses: { 200: ok({ type: 'object', properties: { total: { type: 'integer' }, venues: { type: 'array', items: { $ref: '#/components/schemas/Venue' } } } }, 'Venues, busiest first') } } },
    },
    components: { schemas: { Event: event, Tour: tour, Venue: venue } },
  };
}
