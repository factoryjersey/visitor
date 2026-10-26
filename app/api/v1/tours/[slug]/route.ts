import { getTour, json, preflight } from '@/lib/agents/api';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const tour = await getTour((await params).slug);
  return tour ? json(tour) : json({ error: 'not_found' }, 404);
}

export const OPTIONS = preflight;
