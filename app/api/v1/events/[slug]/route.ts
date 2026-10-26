import { getEvent, json, preflight } from '@/lib/agents/api';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent((await params).slug);
  return event ? json(event) : json({ error: 'not_found' }, 404);
}

export const OPTIONS = preflight;
