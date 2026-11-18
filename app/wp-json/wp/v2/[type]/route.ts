import { and, desc, eq, gt, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { events, places, sourceRecords } from '@/lib/db/schema';
import { API_HEADERS, preflight } from '@/lib/agents/api';
import { wpEvent } from '@/lib/agents/wordpress';

export const dynamic = 'force-dynamic';

/** WordPress's own error shape, so a WordPress client reads ours as it reads theirs. */
const wpError = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ code, message, data: { status } }), { status, headers: API_HEADERS });

/**
 * GET /wp-json/wp/v2/events: the events on guide.je, still to come, in the
 * shape jersey.com's own WordPress API gives them (lib/agents/wordpress.ts),
 * for Visit Jersey to read as they read their own.
 *
 *   per_page   1-100, default 10, as WordPress's
 *   page       from 1; the total and the pages are in x-wp-total and x-wp-totalpages
 *   modified_after  ISO date-time: only what has changed since
 *   exclude_jersey_com=1   leave out the events jersey.com lists itself
 *   lang       accepted and ignored: everything here is in English
 *
 * Newest change first, as orderby=modified would give.
 */
export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (type !== 'events') return wpError(404, 'rest_no_route', 'No route was found matching the URL and request method. Only events are served here.');

  const p = new URL(req.url).searchParams;
  const perPage = Math.min(100, Math.max(1, Number(p.get('per_page')) || 10));
  const page = Math.max(1, Math.floor(Number(p.get('page')) || 1));
  const modifiedAfter = p.get('modified_after') ? new Date(p.get('modified_after')!) : null;
  if (modifiedAfter && Number.isNaN(modifiedAfter.getTime())) return wpError(400, 'rest_invalid_param', 'Invalid parameter(s): modified_after');

  // Public on guide.je: approved, not left out, a day still to come.
  const onJerseyCom = sql`exists (select 1 from ${sourceRecords} v where v.event_id = ${events.id} and v.source = 'visit_jersey' and v.present)`;
  const where = and(
    ne(events.inclusion, 'excluded'),
    eq(events.review, 'approved'),
    sql`exists (select 1 from jsonb_array_elements(${events.dates}) d where d->>'date' >= to_char(now(), 'YYYY-MM-DD'))`,
    ...(modifiedAfter ? [gt(events.updatedAt, modifiedAfter)] : []),
    ...(p.get('exclude_jersey_com') === '1' ? [sql`not ${onJerseyCom}`] : []),
  );

  const [{ total }] = (await db.select({ total: sql<number>`count(*)::int` }).from(events).where(where)) as [{ total: number }];
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (page > totalPages && total > 0) return wpError(400, 'rest_post_invalid_page_number', 'The page number requested is larger than the number of pages available.');

  const rows = await db
    .select({
      event: events,
      venuePlaceName: places.name,
      sources: sql<string[]>`coalesce((select array_agg(distinct s.source) from ${sourceRecords} s where s.event_id = ${events.id} and s.present), '{}')`,
      jerseyComId: sql<string | null>`(select v.external_id from ${sourceRecords} v where v.event_id = ${events.id} and v.source = 'visit_jersey' and v.present limit 1)`,
    })
    .from(events)
    .leftJoin(places, eq(places.id, events.placeId))
    .where(where)
    .orderBy(desc(events.updatedAt), events.id)
    .limit(perPage)
    .offset((page - 1) * perPage);

  const body = rows.map((r) => wpEvent({ ...r.event, venuePlaceName: r.venuePlaceName }, { sources: r.sources, jerseyComId: r.jerseyComId }));
  return new Response(JSON.stringify(body), {
    headers: { ...API_HEADERS, 'x-wp-total': String(total), 'x-wp-totalpages': String(totalPages), 'access-control-expose-headers': 'x-wp-total, x-wp-totalpages' },
  });
}

export const OPTIONS = preflight;
