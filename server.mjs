import { createServer } from 'node:http';
import next from 'next';

/**
 * `next start`, with one repair. A page's script lives under its route
 * folder, /_next/static/chunks/app/(site)/venues/[slug]/page-….js, and
 * Next serves it only at the path exactly as Next writes it: the
 * brackets as %5B and %5D, the parentheses as they are. Railway's edge
 * passes the path on spelled otherwise, and every page under a [slug]
 * folder then failed to load in the browser. Spell it Next's way first.
 */
const port = Number(process.env.PORT ?? 3000);
/**
 * A second repair. A server action that ends in redirect() has Next fetch
 * the page it redirects to from this server, at the request's own origin:
 * https://guide.je behind Railway's edge, where this server speaks plain
 * HTTP on its port. The fetch failed ("SSL wrong version number"), and the
 * site's refresh queued by the action went with it: an event taken off the
 * site stayed in the front page's banner. `next start` tells Next where it
 * is listening; so do we.
 */
process.env.__NEXT_PRIVATE_ORIGIN ??= `http://127.0.0.1:${port}`;
const app = next({ dev: false, port });
const handle = app.getRequestHandler();

export function nextSpelling(url) {
  if (!url.startsWith('/_next/static/')) return url;
  const q = url.indexOf('?');
  const path = q === -1 ? url : url.slice(0, q);
  let decoded;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return url;
  }
  return decoded.replace(/\[/g, '%5B').replace(/\]/g, '%5D') + (q === -1 ? '' : url.slice(q));
}

/**
 * One address for the site: guide.je, as NEXT_PUBLIC_APP_URL names it.
 * The old visitor.je and the www. spellings lead there, path and all, so
 * people's links still arrive and crawlers see one site, not three. Any
 * other host (Railway's own, its health check) is served as it is.
 */
const primary = new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://guide.je');
export function elsewhere(host) {
  const h = (host ?? '').toLowerCase().replace(/:\d+$/, '');
  if (!h || h === primary.hostname) return false;
  return h === `www.${primary.hostname}` || h === 'visitor.je' || h.endsWith('.visitor.je');
}

/**
 * A third repair. What's On and search render afresh on every request,
 * database and all, and a flood of requests for them (hundreds a second,
 * from everywhere, as on 22 November 2026) took the site down. The bare
 * pages, as a visitor with no search and no sign-in sees them, are kept
 * for a minute and handed to everyone who asks, rendered at most once a
 * minute however many ask at once. Anything personal or particular, a
 * signed-in visitor, a query, Next's own in-page requests, is rendered as
 * before.
 */
const SHARED = new Set(['/whats-on', '/search']);
const KEEP_MS = 60_000;
const kept = new Map(); // path -> { at, status, headers, body } or { pending: Promise }

export function shareable(req) {
  if (req.method !== 'GET') return null;
  const url = req.url ?? '/';
  if (url.includes('?') || req.headers['x-guide-render']) return null;
  if (!SHARED.has(url)) return null;
  if (req.headers['rsc'] || req.headers['next-router-prefetch'] || req.headers['next-action']) return null;
  if (/(?:^|;\s*)sb-[^=]*=/.test(req.headers.cookie ?? '')) return null;
  return url;
}

function serveKept(entry, res) {
  res.writeHead(entry.status, { ...entry.headers, 'x-guide-shared': 'hit' });
  res.end(entry.body);
}

/** Renders the page once, by asking this server for it as Next serves it (marked, so it is not shared), and keeps it if it is a plain success. */
async function renderToMemory(path, req) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: { host: req.headers.host ?? primary.hostname, 'x-guide-render': '1', 'user-agent': 'guide-shared-render', accept: 'text/html' },
      signal: AbortSignal.timeout(60_000),
    });
    const body = Buffer.from(await r.arrayBuffer());
    const headers = {};
    r.headers.forEach((v, k) => { headers[k] = v; });
    return { status: r.status, headers, body };
  } catch {
    return null;
  }
}

await app.prepare();
createServer((req, res) => {
  if (elsewhere(req.headers.host)) {
    res.writeHead(301, { location: `${primary.origin}${req.url ?? '/'}`, 'cache-control': 'public, max-age=86400' });
    res.end();
    return;
  }
  req.url = nextSpelling(req.url ?? '/');
  const key = shareable(req);
  if (!key) {
    handle(req, res);
    return;
  }
  const entry = kept.get(key);
  if (entry?.body && Date.now() - entry.at < KEEP_MS) return serveKept(entry, res);
  // One render at a time per page; everyone else waits for it.
  const pending = entry?.pending ?? renderToMemory(key, req).then((r) => {
    if (r && r.status === 200 && r.body.length) {
      const headers = { ...r.headers };
      delete headers['set-cookie'];
      delete headers['content-length'];
      delete headers['transfer-encoding'];
      delete headers['content-encoding'];
      delete headers['connection'];
      kept.set(key, { at: Date.now(), status: 200, headers, body: r.body });
    } else kept.delete(key);
    return r;
  });
  if (!entry?.pending) kept.set(key, { ...(entry?.body ? entry : {}), pending });
  pending.then((r) => {
    const fresh = kept.get(key);
    if (fresh?.body) serveKept(fresh, res);
    else if (entry?.body) serveKept(entry, res);
    else if (r) { res.writeHead(r.status, r.headers); res.end(r.body); }
    else handle(req, res);
  });
}).listen(port, () => console.log(`ready on ${port}`));
