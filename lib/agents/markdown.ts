import { SITE, SITE_ABOUT, SITE_TITLE, eventLine, eventOut, tourLine, tourOut, venueOut, type EventOut, type TourOut } from '@/lib/agents/data';
import {
  publicEvent,
  publicEvents,
  publicEventsAt,
  publicOrganiser,
  publicOrganisers,
  publicTour,
  publicTours,
  publicVenue,
  publicVenuesWithEvents,
  todayIso,
} from '@/lib/db/public';
import { UNIQUE } from '@/lib/domain/occurrence';

/**
 * Each public page as Markdown, for agents that would rather not pick
 * through the HTML: the same listings, the same order, links to the
 * other pages' Markdown. Null for a page there is none of.
 */

const md = (path: string) => `${SITE}${path === '/' ? '/index' : path}.md`;
const page = (title: string, path: string, ...parts: (string | null | false | undefined)[]) =>
  [`# ${title}`, '', `Web page: ${SITE}${path === '/' ? '' : path}`, '', ...parts.filter((p): p is string => typeof p === 'string'), ''].join('\n');
const facts = (rows: [string, string | null | undefined][]) =>
  rows.filter(([, v]) => v).map(([k, v]) => `- **${k}:** ${v}`).join('\n');

function eventPage(e: EventOut) {
  return page(
    e.title,
    new URL(e.url).pathname,
    facts([
      ['When', e.when],
      ['Where', [e.venue, e.address ?? e.parish].filter(Boolean).join(', ')],
      ['Price', e.price],
      ['Kind', e.kinds.join(', ')],
      ['Organiser', e.organiser],
      ['Tickets and details', e.tickets],
      ['Venue page', e.venueUrl && `${e.venueUrl}.md`],
    ]),
    e.summary && `\n> ${e.summary}`,
    e.description && `\n${e.description}`,
    e.dates.length > 1 && `\n## Dates\n\n${e.dates.map((d) => `- ${d.date}${d.start ? ` ${d.start}` : ''}${d.end ? `–${d.end}` : ''}`).join('\n')}`,
  );
}

function tourPage(t: TourOut) {
  return page(
    t.title,
    new URL(t.url).pathname,
    facts([
      ['When', t.bookableAnyDay ? 'Any day, by booking' : t.when],
      ['Meets', [t.meetingPoint, t.parish].filter(Boolean).join(', ')],
      ['Duration', t.duration],
      ['Price', t.price],
      ['Kind', t.kind],
      ['Run by', t.runBy],
      ['Book', t.book],
    ]),
    t.summary && `\n> ${t.summary}`,
    t.description && `\n${t.description}`,
  );
}

export async function markdownFor(segments: string[]): Promise<string | null> {
  const today = todayIso();
  const [section, slug, extra] = segments;
  if (extra) return null;

  if (!section || section === 'index') {
    const [events, tours] = await Promise.all([publicEvents(), publicTours()]);
    const soon = events.filter((r) => UNIQUE.includes(r.event.occurrence)).slice(0, 12);
    return page(
      SITE_TITLE,
      '/',
      SITE_ABOUT,
      `\n## Unique events coming soon\n\n${soon.map((r) => eventLine(eventOut({ ...r.event, ...r.text }, r.venue, today))).join('\n')}\n\nAll of them: ${md('/whats-on')}`,
      `\n## Tours & experiences\n\n${tours.slice(0, 6).map((r) => tourLine(tourOut(r.tour, r.provider, today))).join('\n')}\n\nAll of them: ${md('/tours')}`,
      `\n## More\n\n- [Venues](${md('/venues')})\n- [Organisers](${md('/organisers')})\n- [List your venue, event or tour](${md('/list')})\n- [Everything in one file](${SITE}/llms-full.txt)`,
    );
  }

  if (section === 'whats-on') {
    if (slug) {
      const row = await publicEvent(slug);
      return row ? eventPage(eventOut(row.event, row.venue, today)) : null;
    }
    const events = await publicEvents();
    return page(
      'What’s on in Jersey',
      '/whats-on',
      'One-off and dated events, soonest first. Exhibitions, attractions open daily and weekly sessions are in the full list.',
      '',
      events.map((r) => eventLine(eventOut({ ...r.event, ...r.text }, r.venue, today))).join('\n'),
      `\nEverything, ongoing too: ${SITE}/llms-full.txt`,
    );
  }

  if (section === 'tours') {
    if (slug) {
      const row = await publicTour(slug);
      return row ? tourPage(tourOut(row.tour, row.provider, today)) : null;
    }
    const tours = await publicTours({ showOnDemand: true });
    return page('Tours & experiences in Jersey', '/tours', '', tours.map((r) => tourLine(tourOut(r.tour, r.provider, today))).join('\n'));
  }

  if (section === 'venues') {
    if (slug) {
      const v = await publicVenue(slug);
      if (!v) return null;
      const on = await publicEventsAt(v.id);
      const out = venueOut(v);
      return page(
        v.name,
        `/venues/${v.slug}`,
        facts([['Where', out.address ?? out.parish], ['Website', out.website], ['Phone', out.phone]]),
        out.summary && `\n${out.summary}`,
        `\n## Coming up\n\n${on.length ? on.map((r) => eventLine(eventOut({ ...r.event, ...r.text }, r.venue, today))).join('\n') : 'Nothing listed just now.'}`,
      );
    }
    const venues = await publicVenuesWithEvents();
    return page('Venues in Jersey', '/venues', 'Places with events coming up, and how many.', '', venues.map((v) => `- [${v.name}](${md(`/venues/${v.slug}`)}): ${v.count} coming up`).join('\n'));
  }

  if (section === 'organisers') {
    if (slug) {
      const found = await publicOrganiser(slug);
      if (!found) return null;
      return page(
        found.organiser.name,
        `/organisers/${found.organiser.slug}`,
        found.organiser.website && `Website: ${found.organiser.website}`,
        found.events.length > 0 && `\n## Events\n\n${found.events.map((r) => eventLine(eventOut(r.event, r.venue, today))).join('\n')}`,
        found.tours.length > 0 && `\n## Tours & experiences\n\n${found.tours.map((r) => tourLine(tourOut(r.tour, null, today))).join('\n')}`,
      );
    }
    const all = await publicOrganisers();
    return page('Organisers in Jersey', '/organisers', '', all.map((o) => `- [${o.name}](${md(`/organisers/${o.slug}`)}): ${[o.events && `${o.events} events`, o.tours && `${o.tours} tours`].filter(Boolean).join(', ')}`).join('\n'));
  }

  if (section === 'list' && !slug) {
    return page(
      'List your venue, event or tour',
      '/list',
      'Listing on Visitor and in the printed Visit Jersey Visitor Guide is free. Venues, organisers and tour operators can claim a listing already on the site, or ask to add their own; the guide’s editors check every request. Claimed listings can be kept up to date and new dates added from an account.',
      `\nStart here: ${SITE}/list`,
    );
  }
  return null;
}
