import { json, preflight, searchTours } from '@/lib/agents/api';

export const dynamic = 'force-dynamic';

/** GET /api/v1/tours?q=&kind=&anyday=0&limit= */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  return json(
    await searchTours({
      q: p.get('q') ?? undefined,
      kind: p.get('kind') ?? undefined,
      includeAnyDay: p.get('anyday') !== '0' && p.get('anyday') !== 'false',
      limit: p.has('limit') ? Number(p.get('limit')) : undefined,
    }),
  );
}

export const OPTIONS = preflight;
