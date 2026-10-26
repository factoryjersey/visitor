import { markdownFor } from '@/lib/agents/markdown';

export const dynamic = 'force-dynamic';

/**
 * The Markdown version of a public page. Reached by adding .md to the
 * page's address, or asking for text/markdown; middleware sends both here.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const body = await markdownFor(path);
  if (!body) return new Response('Not found\n', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  return new Response(body, {
    headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=300', vary: 'Accept' },
  });
}
