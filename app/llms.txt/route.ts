import { SITE, SITE_ABOUT, SITE_TITLE } from '@/lib/agents/data';

/** The site for language models, in the llmstxt.org shape: what it is, and where to read on. */
export function GET() {
  const body = `# ${SITE_TITLE}

> ${SITE_ABOUT}

Every page has a Markdown version: add \`.md\` to its address (${SITE}/whats-on.md), or ask for \`Accept: text/markdown\`. Dates are in Jersey time (Europe/Jersey); prices are in pounds sterling.

## What's on

- [Events in Jersey](${SITE}/whats-on.md): one-off and dated events, soonest first, filterable by month, kind and venue
- [Tours & experiences](${SITE}/tours.md): guided walks, boat trips, food tours and classes, on dates or any day
- [Venues](${SITE}/venues.md): the places hosting events, with what is coming up at each
- [Organisers](${SITE}/organisers.md): who puts the events and tours on

## For programs

- [Every listing in one file](${SITE}/llms-full.txt): upcoming events and tours in Markdown
- [API](${SITE}/openapi.json): read-only JSON, no key needed; events, tours and venues
- [MCP server](${SITE}/mcp): streamable HTTP, read-only tools to search what's on; card at ${SITE}/.well-known/mcp/server-card.json

## About

- [List your venue, event or tour](${SITE}/list.md): free; the guide's editors check every listing
- [Sitemap](${SITE}/sitemap.xml)
`;
  return new Response(body, { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
