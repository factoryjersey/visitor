import { SITE } from '@/lib/agents/data';

/** RFC 9727: where the site's APIs are and what describes them, as a linkset. */
export function GET() {
  const linkset = {
    linkset: [
      {
        anchor: `${SITE}/api/v1`,
        'service-desc': [{ href: `${SITE}/openapi.json`, type: 'application/openapi+json' }],
        'service-doc': [{ href: `${SITE}/llms.txt`, type: 'text/markdown' }],
      },
      {
        anchor: `${SITE}/mcp`,
        'service-desc': [{ href: `${SITE}/.well-known/mcp/server-card.json`, type: 'application/json' }],
        'service-doc': [{ href: `${SITE}/llms.txt`, type: 'text/markdown' }],
      },
    ],
  };
  return new Response(JSON.stringify(linkset, null, 2), {
    headers: { 'content-type': 'application/linkset+json; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=3600' },
  });
}
