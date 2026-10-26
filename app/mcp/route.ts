import { handle } from '@/lib/agents/mcp';

export const dynamic = 'force-dynamic';

const HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-session-id',
  'access-control-expose-headers': 'mcp-protocol-version',
};

/** MCP over streamable HTTP: a JSON-RPC message, or a batch of them, in each POST. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400, headers: HEADERS });
  }
  const messages = Array.isArray(body) ? body : [body];
  const answers = (await Promise.all(messages.map((m) => handle(m)))).filter((a) => a !== null);
  // Only notifications: accepted, nothing to say.
  if (!answers.length) return new Response(null, { status: 202, headers: HEADERS });
  return Response.json(Array.isArray(body) ? answers : answers[0], { headers: HEADERS });
}

/** No server-sent stream: every answer comes back on its POST. */
export function GET() {
  return new Response('This MCP server answers POSTs only (streamable HTTP, JSON responses).\n', { status: 405, headers: { ...HEADERS, allow: 'POST, OPTIONS' } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS });
}
