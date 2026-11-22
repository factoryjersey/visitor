import type { Swatch } from './guide-colours';

/**
 * Swatches as an Adobe Swatch Exchange file (.ase), which InDesign loads
 * from its Swatches panel (Load Swatches…): each colour as a global CMYK
 * swatch under its name, in a group named for the palette.
 */
export function aseFile(group: string, swatches: readonly Swatch[]): Uint8Array {
  const parts: number[] = [];
  const u16 = (v: number) => parts.push((v >> 8) & 255, v & 255);
  const u32 = (v: number) => parts.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
  const name = (s: string) => {
    const units = [...s].map((c) => c.charCodeAt(0));
    const out: number[] = [];
    out.push(((units.length + 1) >> 8) & 255, (units.length + 1) & 255);
    for (const c of [...units, 0]) out.push((c >> 8) & 255, c & 255);
    return out;
  };
  const block = (type: number, body: number[]) => {
    u16(type);
    u32(body.length);
    parts.push(...body);
  };
  parts.push(0x41, 0x53, 0x45, 0x46); // ASEF
  u16(1);
  u16(0);
  u32(swatches.length + 2);
  block(0xc001, name(group));
  for (const w of swatches) {
    const body = [...name(w.name)];
    body.push(0x43, 0x4d, 0x59, 0x4b); // CMYK
    for (const v of w.cmyk) {
      const b = new DataView(new ArrayBuffer(4));
      b.setFloat32(0, v / 100);
      body.push(...new Uint8Array(b.buffer));
    }
    body.push(0, 0); // global
    block(0x0001, body);
  }
  block(0xc002, []);
  return new Uint8Array(parts);
}
