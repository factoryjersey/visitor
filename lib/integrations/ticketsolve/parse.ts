import type { EventDate, Image } from '@/lib/db/schema';
import { classifyOccurrence } from '@/lib/domain/occurrence';
import type { VjEvent } from '@/lib/integrations/jersey-com/parse';
import { decodeEntities, htmlToText } from '@/lib/integrations/jersey-com/parse';

/**
 * Ticketsolve's public shows feed, `https://<venue>.ticketsolve.com/shows.xml`:
 * the Jersey Arts Centre and the Jersey Opera House both sell through it.
 * Venues hold shows, shows hold performances, each with its own time and
 * booking link. One show is one listing, its performances its dates.
 * The feed has no prices.
 *
 * The XML is regular and machine-written, so a few patterns read it;
 * a general parser would be a dependency for one file.
 */

/** Where a feed's venue is, since the feed gives only its name. */
export type VenueInfo = { venueName: string; addressLine1: string; parish: string; postcode: string };

export type TicketsolveFeed = {
  /** The source_records key: "ticketsolve-artscentre". */
  source: string;
  /** "artscentre.ticketsolve.com". */
  host: string;
  /** By the feed's venue name. A venue not here (an off-site show) keeps just its name. */
  venues: Record<string, VenueInfo>;
};

export const FEEDS: TicketsolveFeed[] = [
  {
    source: 'ticketsolve-artscentre',
    host: 'artscentre.ticketsolve.com',
    venues: { 'Jersey Arts Centre': { venueName: 'Jersey Arts Centre', addressLine1: 'Phillips Street', parish: 'St Helier', postcode: 'JE2 4SW' } },
  },
  {
    source: 'ticketsolve-operahouse',
    host: 'jerseyoperahouse.ticketsolve.com',
    venues: { 'Jersey Opera House': { venueName: 'Jersey Opera House', addressLine1: 'Gloucester Street', parish: 'St Helier', postcode: 'JE2 3QR' } },
  },
];

const cdata = (s: string | undefined) => decodeEntities((s ?? '').replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1')).trim();
const tag = (body: string, name: string) => new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(body)?.[1];

/** Their categories to the labels Visit Jersey uses, so one filter covers both. */
function typesOf(category: string): string[] {
  const c = category.toLowerCase();
  if (!c) return [];
  if (/music|concert|opera|choir|orchestra|gig/.test(c)) return ['Music'];
  if (/family|child|kids|panto/.test(c)) return ['Family friendly', 'Arts & cultural'];
  if (/festival/.test(c)) return ['Festivals'];
  return ['Arts & cultural'];
}

/** "2026-10-18T14:30:00+01:00": the feed writes Jersey's own clock, so the day and time are as written. */
function performance(iso: string): EventDate | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso.trim());
  return m ? { date: m[1]!, start: m[2]!, end: null } : null;
}

/** "Seven Drunken Nights<br>The Story of the Dubliners" and the like: the first paragraph, not too long. */
function firstParagraph(text: string | null): string | null {
  const p = text?.split('\n\n')[0]?.trim();
  if (!p) return null;
  return p.length <= 400 ? p : `${p.slice(0, 397).replace(/\s+\S*$/, '')}…`;
}

export function parseShows(xml: string, feed: TicketsolveFeed): VjEvent[] {
  const out: VjEvent[] = [];
  for (const v of xml.matchAll(/<venue id="\d+">([\s\S]*?)<\/venue>/g)) {
    const venueBody = v[1]!;
    const venueLabel = cdata(tag(venueBody.split('<shows>')[0]!, 'name'));
    const place = feed.venues[venueLabel];
    for (const s of venueBody.matchAll(/<show id="(\d+)">([\s\S]*?)<\/show>/g)) {
      const showId = s[1]!;
      const [head, eventsPart = ''] = s[2]!.split('<events>');
      const title = cdata(tag(head!, 'name'));
      if (!title || /cancel/i.test(cdata(tag(s[2]!.split('</events>').at(-1)!, 'status')))) continue;

      const dates: EventDate[] = [];
      for (const ev of eventsPart.matchAll(/<event id="\d+">([\s\S]*?)<\/event>/g)) {
        if (/cancel/i.test(cdata(tag(ev[1]!, 'status')))) continue;
        const d = performance(cdata(tag(ev[1]!, 'date_time_iso')));
        if (d) dates.push(d);
      }
      dates.sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
      if (!dates.length) continue;

      const description = htmlToText(cdata(tag(head!, 'description')));
      const imageUrl = /<url size="large">([^<]+)<\/url>/.exec(head!)?.[1]?.trim();
      const image: Image | null = imageUrl ? { url: imageUrl, publicId: null, alt: null, originalFilename: null } : null;
      const link = `https://${feed.host}/shows/${showId}`;
      // An off-site show names its venue in the copy; "Alternative Venue - See Website" is not a venue.
      const offsite = !place && /alternative venue|see website/i.test(venueLabel);

      out.push({
        externalId: showId,
        title,
        summary: firstParagraph(description),
        description,
        venue: place ? `${place.venueName}, ${place.addressLine1}, ${place.parish}` : offsite ? null : venueLabel || null,
        venueName: place?.venueName ?? (offsite ? null : venueLabel || null),
        addressLine1: place?.addressLine1 ?? null,
        parish: place?.parish ?? null,
        postcode: place?.postcode ?? null,
        phone: null,
        email: null,
        website: link,
        eventTypes: typesOf(cdata(tag(head!, 'event_category'))),
        free: false,
        occurrence: classifyOccurrence(dates.map((d) => d.date), { starts: dates.map((d) => d.start) }),
        lat: null,
        lon: null,
        dates,
        startsOn: dates[0]!.date,
        endsOn: dates.at(-1)!.date,
        fromPricePence: null,
        toPricePence: null,
        headerImage: image,
        sourceLink: link,
        modifiedAt: null,
        portalSyncedAt: null,
      });
    }
  }
  return out;
}
