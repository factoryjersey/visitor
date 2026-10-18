/**
 * CSV for InDesign Data Merge. InDesign reads a CSV's special characters
 * correctly only from UTF-16 with a byte-order mark: as UTF-8, every
 * apostrophe in "Jersey’s" and every é arrives garbled. So the rows are
 * written as text and encoded UTF-16LE.
 */

function cell(v: string): string {
  // Line breaks inside a field break a merge record; the guide's copy is one paragraph.
  const flat = v.replace(/\s*\n+\s*/g, ' ').trim();
  return /[",]/.test(flat) ? `"${flat.replace(/"/g, '""')}"` : flat;
}

export function toCsv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function utf16le(text: string): Uint8Array {
  const out = new Uint8Array(2 + text.length * 2);
  out[0] = 0xff;
  out[1] = 0xfe;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    out[2 + i * 2] = c & 0xff;
    out[3 + i * 2] = c >> 8;
  }
  return out;
}
