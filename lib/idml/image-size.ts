/** A picture's size in pixels from its first bytes: JPEG and PNG, the two InDesign places as they are. Null for anything else. */
export function imageSize(b: Uint8Array): { px: number; py: number; type: 'jpg' | 'png' } | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { px: v.getUint32(16), py: v.getUint32(20), type: 'png' };
  }
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const marker = b[i + 1]!;
    const len = (b[i + 2]! << 8) | b[i + 3]!;
    // Start of frame (baseline, progressive and the rest; not DHT, JPG or DAC): height, then width.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { py: (b[i + 5]! << 8) | b[i + 6]!, px: (b[i + 7]! << 8) | b[i + 8]!, type: 'jpg' };
    }
    i += 2 + len;
  }
  return null;
}

/** jersey.com's pictures, asked for as JPEG at full quality: their service sends WebP or AVIF to browsers, which InDesign cannot place. */
export const asJpeg = (url: string) => (/\/\/cdn\.jersey\.com\/image\/upload\//.test(url) ? url.replace('/image/upload/', '/image/upload/f_jpg,q_95/') : url);
