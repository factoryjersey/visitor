import { json, listVenues, preflight } from '@/lib/agents/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json(await listVenues());
}

export const OPTIONS = preflight;
