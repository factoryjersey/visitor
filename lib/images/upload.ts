import { env } from '@/lib/env';

/**
 * A listing's picture, put in the project's Supabase Storage (the public
 * listing-images bucket) with the service key, server-side only. The
 * browser has already scaled it down, so what arrives is web-sized.
 */
const BUCKET = 'listing-images';
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const MAX_BYTES = 8 * 1024 * 1024;

const storageBase = () => env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');

/** A picture already in our bucket, not one we point at elsewhere. */
export const isOurs = (url: string) => url.startsWith(`${storageBase()}/storage/v1/object/public/${BUCKET}/`);

async function put(kind: string, id: string, type: string, bytes: Buffer): Promise<string> {
  const ext = TYPES[type];
  if (!ext) throw new Error('A JPEG, PNG or WebP picture, please.');
  if (bytes.length > MAX_BYTES) throw new Error('That picture is over 8 MB.');
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Picture uploads need SUPABASE_SERVICE_ROLE_KEY on the server.');
  const path = `${kind}/${id}-${Date.now()}.${ext}`;
  const res = await fetch(`${storageBase()}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': type, 'cache-control': 'max-age=31536000', 'x-upsert': 'false' },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Storage said ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return `${storageBase()}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function storeListingImage(kind: string, id: string, file: File): Promise<string> {
  return put(kind, id, file.type, Buffer.from(await file.arrayBuffer()));
}

/**
 * A copy of a picture from someone else's site in our bucket, so a page
 * does not break when they move or delete theirs.
 */
export async function copyImageToStorage(kind: string, id: string, url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': 'VisitorGuideJersey/1.0 (+https://visitor.je)' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${new URL(url).hostname} said ${res.status}`);
  const type = (res.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase().replace('image/jpg', 'image/jpeg');
  return put(kind, id, type, Buffer.from(await res.arrayBuffer()));
}
