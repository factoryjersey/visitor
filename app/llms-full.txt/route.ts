import { SITE_ABOUT, SITE_TITLE, eventOut, tourOut } from '@/lib/agents/data';
import { publicEvents, publicTours, todayIso } from '@/lib/db/public';

export const dynamic = 'force-dynamic';

/** Everything on, in one Markdown file: each event and tour with its dates, place, price and what it is. */
export async function GET() {
  const today = todayIso();
  const [events, tours] = await Promise.all([publicEvents({ showOngoing: true }), publicTours({ showOnDemand: true })]);
  const block = (title: string, url: string, facts: (string | null | undefined)[], text: string | null) =>
    [`### [${title}](${url})`, '', ...facts.filter(Boolean).map((f) => `- ${f}`), ...(text ? ['', text] : []), ''].join('\n');
  const body = [
    `# ${SITE_TITLE}: everything on`,
    '',
    `> ${SITE_ABOUT}`,
    '',
    `Listings as of ${today}. Dates are in Jersey time; prices in pounds sterling.`,
    '',
    `## Events (${events.length})`,
    '',
    ...events.map(({ event, venue }) => {
      const e = eventOut(event, venue, today);
      return block(e.title, e.url, [e.when && `When: ${e.when}`, e.venue && `Where: ${[e.venue, e.parish].filter(Boolean).join(', ')}`, e.price && `Price: ${e.price}`, e.kinds.length ? `Kind: ${e.kinds.join(', ')}` : null, e.organiser && `Organiser: ${e.organiser}`, e.tickets && `Tickets and details: ${e.tickets}`], e.summary);
    }),
    `## Tours & experiences (${tours.length})`,
    '',
    ...tours.map(({ tour, provider }) => {
      const t = tourOut(tour, provider, today);
      return block(t.title, t.url, [t.bookableAnyDay ? 'When: any day, by booking' : t.when && `When: ${t.when}`, t.meetingPoint && `Meets: ${[t.meetingPoint, t.parish].filter(Boolean).join(', ')}`, t.duration && `Duration: ${t.duration}`, t.price && `Price: ${t.price}`, t.kind && `Kind: ${t.kind}`, t.runBy && `Run by: ${t.runBy}`, t.book && `Book: ${t.book}`], t.summary);
    }),
  ].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=900' } });
}
