import { unsubscribe } from '@/lib/subscribers';

/**
 * One-click unsubscribe (RFC 8058): the mail app's own button POSTs here,
 * as the List-Unsubscribe header on every weekly email says. No page, no
 * click to confirm. A GET does nothing, so link checkers cannot use it.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('t') ?? '';
  await unsubscribe(token);
  // The same answer whether or not the token matched: it says nothing about who is on the list.
  return new Response(null, { status: 204 });
}
