import type { Image } from '@/lib/db/schema';

/**
 * Visit Jersey's images are on Cloudinary, and the URL they give is the
 * original upload — camera files, full-bleed A4 at 300dpi. Cloudinary
 * takes transformations in the path, so the web gets a derivative and
 * print gets the original, from the same record.
 */

const UPLOAD = '/image/upload/';

export function transformed(url: string, transformation: string): string {
  const i = url.indexOf(UPLOAD);
  if (i < 0) return url;
  return `${url.slice(0, i + UPLOAD.length)}${transformation}/${url.slice(i + UPLOAD.length)}`;
}

/** A web-sized, cropped derivative. */
export function webImage(img: Image, width: number, height?: number): string {
  // Pexels resizes by query string.
  if (img.url.startsWith('https://images.pexels.com/')) {
    const u = new URL(img.url);
    u.search = new URLSearchParams({ auto: 'compress', cs: 'tinysrgb', w: String(width), ...(height ? { h: String(height), fit: 'crop' } : {}) }).toString();
    return u.toString();
  }
  const crop = height ? `,h_${height},c_fill,g_auto` : ',c_limit';
  return transformed(img.url, `w_${width}${crop},q_auto,f_auto`);
}

/** The original upload, untouched, for print. */
export function printImage(img: Image): string {
  return img.url;
}
