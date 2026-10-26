import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/public', () => ({ todayIso: () => '2026-10-19' }));
vi.mock('@/lib/agents/api', () => ({
  searchEvents: vi.fn(async () => ({ total: 0, events: [] })),
  getEvent: vi.fn(async () => null),
  searchTours: vi.fn(),
  getTour: vi.fn(),
  listVenues: vi.fn(),
}));

const { handle, serverCard, TOOLS } = await import('@/lib/agents/mcp');
const { eventLd, breadcrumbs } = await import('@/lib/agents/schema-org');
const { openApi } = await import('@/lib/agents/openapi');
const { alternates } = await import('@/lib/agents/data');

describe('MCP server', () => {
  it('agrees a protocol version, offering its own when the client’s is unknown', async () => {
    const known = (await handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } })) as { result: { protocolVersion: string; serverInfo: { name: string } } };
    expect(known.result.protocolVersion).toBe('2025-06-18');
    expect(known.result.serverInfo.name).toBe('visitor-je');
    const unknown = (await handle({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } })) as { result: { protocolVersion: string } };
    expect(unknown.result.protocolVersion).toBe('2025-11-25');
  });

  it('lists read-only tools', async () => {
    const res = (await handle({ jsonrpc: '2.0', id: 3, method: 'tools/list' })) as { result: { tools: typeof TOOLS } };
    expect(res.result.tools.map((t) => t.name)).toEqual(['search_events', 'get_event', 'search_tours', 'get_tour', 'list_venues']);
    expect(res.result.tools.every((t) => t.annotations.readOnlyHint)).toBe(true);
  });

  it('answers a tool call with text and structured content', async () => {
    const res = (await handle({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'search_events', arguments: { q: 'jazz' } } })) as { result: { content: { text: string }[]; structuredContent: unknown } };
    expect(res.result.structuredContent).toEqual({ total: 0, events: [] });
    expect(JSON.parse(res.result.content[0]!.text)).toEqual({ total: 0, events: [] });
  });

  it('says nothing to a notification and errors on what it does not know', async () => {
    expect(await handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull();
    expect(await handle({ jsonrpc: '2.0', id: 5, method: 'resources/list' })).toMatchObject({ error: { code: -32601 } });
    expect(await handle({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'delete_everything' } })).toMatchObject({ error: { code: -32602 } });
  });

  it('describes itself for discovery', () => {
    expect(serverCard()).toMatchObject({ transport: { type: 'streamable-http' }, authentication: { required: false } });
  });
});

describe('schema.org', () => {
  const e = {
    slug: 'jersey-rfc-v-oundle-2026', url: 'https://visitor.je/whats-on/jersey-rfc-v-oundle-2026', title: 'Jersey RFC v Oundle', summary: 'A league match.', description: null,
    kinds: ['Sports'], when: 'Saturday 7 November', next: '2026-11-07', dates: [{ date: '2026-11-07', start: '15:15', end: null }], occurrence: 'one-off' as const,
    venue: 'Jersey Rugby Club', venueUrl: null, parish: 'St Peter', address: 'La Rue des Landes, St Peter', price: null, free: false, fromPricePence: null, toPricePence: null,
    organiser: 'Jersey RFC', tickets: 'https://jrfc.je/', image: null, lat: null, lon: null,
  };

  it('gives an event its start with the time, its place and organiser', () => {
    const ld = eventLd(e);
    expect(ld.startDate).toBe('2026-11-07T15:15');
    expect(ld.location).toMatchObject({ '@type': 'Place', name: 'Jersey Rugby Club', address: { addressCountry: 'JE' } });
    expect(ld.organizer).toEqual({ '@type': 'Organization', name: 'Jersey RFC' });
    expect(ld.offers).toBeUndefined();
  });

  it('starts breadcrumbs at home', () => {
    expect(breadcrumbs([['What’s on', '/whats-on']]).itemListElement.map((i) => i.item)).toEqual(['https://visitor.je', 'https://visitor.je/whats-on']);
  });
});

describe('OpenAPI and alternates', () => {
  it('describes every API path', () => {
    expect(Object.keys(openApi().paths)).toEqual(['/events', '/events/{slug}', '/tours', '/tours/{slug}', '/venues']);
  });

  it('points each page at its Markdown', () => {
    expect(alternates('/')).toEqual({ canonical: '/', types: { 'text/markdown': '/index.md' } });
    expect(alternates('/tours/x').types['text/markdown']).toBe('/tours/x.md');
  });
});
