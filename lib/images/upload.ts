import { env } from '@/lib/env';

/**
 * A listing's picture, put in the project's Supabase Storage (the public
 * listing-images bucket) with the service key, server-side only. The
 * browser has already scaled it down, so what arrives is web-sized.
 */
const BUCKET = 'listing-images';
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const MAX_BYTES = 8 * 1024 * 1024;

export async function storeListingImage(kind: string, id: string, file: File): Promise<string> {
  const ext = TYPES[file.type];
  if (!ext) throw new Error('A JPEG, PNG or WebP picture, please.');
  if (file.size > MAX_BYTES) throw new Error('That picture is over 8 MB.');
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Picture uploads need SUPABASE_SERVICE_ROLE_KEY on the server.');
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
  const path = `${kind}/${id}-${Date.now()}.${ext}`;
  const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': file.type, 'cache-control': 'max-age=31536000', 'x-upsert': 'false' },
    body: Buffer.from(await file.arrayBuffer()),
  });
  if (!res.ok) throw new Error(`Storage said ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}
