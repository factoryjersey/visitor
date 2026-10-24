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

await app.prepare();
createServer((req, res) => {
  req.url = nextSpelling(req.url ?? '/');
  handle(req, res);
}).listen(port, () => console.log(`ready on ${port}`));
