import { getEvent, getTour, listVenues, searchEvents, searchTours } from '@/lib/agents/api';
import { SITE, SITE_ABOUT } from '@/lib/agents/data';
import { EVENT_TYPES } from '@/lib/domain/categorise';
import { GENRES } from '@/lib/domain/genre';

/**
 * A read-only MCP server (modelcontextprotocol.io) over streamable HTTP:
 * an agent asked "what's on in Jersey this weekend" can search the guide
 * itself. Stateless, no sign-in; each POST is answered with JSON, never a
 * stream, which the transport allows.
 */

export const SERVER_INFO = { name: 'visitor-je', title: 'Visitor: Jersey’s What’s On Guide', version: '1.0.0', websiteUrl: SITE };
const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

export const INSTRUCTIONS = `${SITE_ABOUT} Use search_events for what is on (by words, days, kind or venue) and search_tours for tours and experiences; get_event and get_tour give one listing in full. Dates are in Jersey time. Link people to each listing's url.`;

const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const day = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };

export const TOOLS = [
  {
    name: 'search_events',
    title: 'Search events in Jersey',
    description: 'Events coming up in Jersey, soonest first: concerts, shows, festivals, markets, sport, talks, family days. Filter by words, a range of days, a kind or a venue.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Words in the title or venue, e.g. "jazz" or "Opera House"' },
        from: { ...day, description: 'First day, YYYY-MM-DD; default today' },
        to: { ...day, description: 'Last day, YYYY-MM-DD' },
        kind: { type: 'string', enum: EVENT_TYPES.filter((t) => t !== 'Business & networking') },
        venue: { type: 'string', description: 'A venue slug from list_venues, or words in its name' },
        include_ongoing: { type: 'boolean', description: 'Also exhibitions, daily attractions and weekly sessions' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Search events', ...readOnly },
  },
  {
    name: 'get_event',
    title: 'One event',
    description: 'One event in full: every date and time, the venue, price, organiser and where to book.',
    inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'], additionalProperties: false },
    annotations: { title: 'Get event', ...readOnly },
  },
  {
    name: 'search_tours',
    title: 'Search tours and experiences in Jersey',
    description: 'Guided walks, tide walks, boat trips, food tours and classes in Jersey, dated ones by their next date, then those bookable any day.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Words in the title or the operator’s name' },
        kind: { type: 'string', enum: [...GENRES] },
        include_any_day: { type: 'boolean', default: true, description: 'Include tours bookable on any day' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Search tours', ...readOnly },
  },
  {
    name: 'get_tour',
    title: 'One tour or experience',
    description: 'One tour or experience in full: when it runs, where it meets, how long, price, who runs it and where to book.',
    inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'], additionalProperties: false },
    annotations: { title: 'Get tour', ...readOnly },
  },
  {
    name: 'list_venues',
    title: 'Venues in Jersey',
    description: 'The venues with events coming up, busiest first, with their slugs for search_events.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { title: 'List venues', ...readOnly },
  },
] as const;

type Args = Record<string, unknown>;
const s = (v: unknown) => (typeof v === 'string' ? v : undefined);
const n = (v: unknown) => (typeof v === 'number' ? v : undefined);
const b = (v: unknown) => (typeof v === 'boolean' ? v : undefined);

async function callTool(name: string, a: Args): Promise<unknown | null> {
  switch (name) {
    case 'search_events':
      return searchEvents({ q: s(a.q), from: s(a.from), to: s(a.to), kind: s(a.kind), venue: s(a.venue), includeOngoing: b(a.include_ongoing), limit: n(a.limit) ?? 20 });
    case 'get_event':
      return (await getEvent(s(a.slug) ?? '')) ?? { error: 'No event with that slug is on the site.' };
    case 'search_tours':
      return searchTours({ q: s(a.q), kind: s(a.kind), includeAnyDay: b(a.include_any_day), limit: n(a.limit) ?? 20 });
    case 'get_tour':
      return (await getTour(s(a.slug) ?? '')) ?? { error: 'No tour with that slug is on the site.' };
    case 'list_venues':
      return listVenues();
    default:
      return null;
  }
}

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const ok = (id: Rpc['id'], result: unknown) => ({ jsonrpc: '2.0', id, result });
const fail = (id: Rpc['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

/** One JSON-RPC message in, its answer out; null for a notification, which has none. */
export async function handle(msg: Rpc): Promise<object | null> {
  if (msg?.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fail(msg?.id, -32600, 'Invalid request');
  const isNotification = msg.id === undefined;
  if (isNotification) return null;
  switch (msg.method) {
    case 'initialize': {
      const asked = s(msg.params?.protocolVersion);
      return ok(msg.id, {
        protocolVersion: asked && VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return ok(msg.id, {});
    case 'tools/list':
      return ok(msg.id, { tools: TOOLS });
    case 'tools/call': {
      const name = s(msg.params?.name) ?? '';
      const args = (msg.params?.arguments as Args) ?? {};
      try {
        const result = await callTool(name, args);
        if (result === null) return fail(msg.id, -32602, `Unknown tool: ${name}`);
        return ok(msg.id, { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result, isError: false });
      } catch (e) {
        return ok(msg.id, { content: [{ type: 'text', text: `Failed: ${(e as Error).message}` }], isError: true });
      }
    }
    default:
      return fail(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

/** The server described for discovery, at /.well-known/mcp/server-card.json. */
export function serverCard() {
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json',
    version: '1.0',
    protocolVersion: VERSIONS[0],
    serverInfo: SERVER_INFO,
    description: INSTRUCTIONS,
    documentationUrl: `${SITE}/llms.txt`,
    transport: { type: 'streamable-http', endpoint: `${SITE}/mcp` },
    capabilities: { tools: { listChanged: false } },
    authentication: { required: false, schemes: [] },
    tools: TOOLS.map(({ name, title, description }) => ({ name, title, description })),
  };
}
