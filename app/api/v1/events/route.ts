import { json, preflight, searchEvents } from '@/lib/agents/api';

export const dynamic = 'force-dynamic';

/** GET /api/v1/events?q=&from=&to=&kind=&venue=&ongoing=1&limit= */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  return json(
    await searchEvents({
      q: p.get('q') ?? undefined,
      from: p.get('from') ?? undefined,
      to: p.get('to') ?? undefined,
      kind: p.get('kind') ?? undefined,
      venue: p.get('venue') ?? undefined,
      includeOngoing: p.get('ongoing') === '1' || p.get('ongoing') === 'true',
      limit: p.has('limit') ? Number(p.get('limit')) : undefined,
    }),
  );
}

export const OPTIONS = preflight;
