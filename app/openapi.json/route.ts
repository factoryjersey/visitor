import { API_HEADERS } from '@/lib/agents/api';
import { openApi } from '@/lib/agents/openapi';

export function GET() {
  return new Response(JSON.stringify(openApi(), null, 2), { headers: { ...API_HEADERS, 'cache-control': 'public, max-age=3600' } });
}
