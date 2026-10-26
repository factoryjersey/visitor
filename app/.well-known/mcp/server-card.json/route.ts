import { serverCard } from '@/lib/agents/mcp';

export function GET() {
  return Response.json(serverCard(), { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=3600' } });
}
