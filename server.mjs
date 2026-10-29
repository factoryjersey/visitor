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

await app.prepare();
createServer((req, res) => {
  if (elsewhere(req.headers.host)) {
    res.writeHead(301, { location: `${primary.origin}${req.url ?? '/'}`, 'cache-control': 'public, max-age=86400' });
    res.end();
    return;
  }
  req.url = nextSpelling(req.url ?? '/');
  handle(req, res);
}).listen(port, () => console.log(`ready on ${port}`));
