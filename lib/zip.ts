/**
 * A zip written as it goes, its files stored as they are (pictures are
 * compressed already): each file's header and bytes as soon as it is
 * ready, the directory at the end. Enough for a download; no library.
 */

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) c = TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

type Entry = { name: Uint8Array; crc: number; size: number; offset: number };

export class ZipWriter {
  private entries: Entry[] = [];
  private offset = 0;
  constructor(private push: (chunk: Uint8Array) => void) {}

  add(path: string, data: Uint8Array) {
    const name = new TextEncoder().encode(path);
    const crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    head.setUint32(0, 0x04034b50, true);
    head.setUint16(4, 20, true);
    head.setUint16(6, 0x0800, true); // names in UTF-8
    head.setUint16(8, 0, true); // stored
    head.setUint32(14, crc, true);
    head.setUint32(18, data.length, true);
    head.setUint32(22, data.length, true);
    head.setUint16(26, name.length, true);
    this.push(new Uint8Array(head.buffer));
    this.push(name);
    this.push(data);
    this.entries.push({ name, crc, size: data.length, offset: this.offset });
    this.offset += 30 + name.length + data.length;
  }

  finish() {
    const start = this.offset;
    for (const e of this.entries) {
      const d = new DataView(new ArrayBuffer(46));
      d.setUint32(0, 0x02014b50, true);
      d.setUint16(4, 20, true);
      d.setUint16(6, 20, true);
      d.setUint16(8, 0x0800, true);
      d.setUint32(16, e.crc, true);
      d.setUint32(20, e.size, true);
      d.setUint32(24, e.size, true);
      d.setUint16(28, e.name.length, true);
      d.setUint32(42, e.offset, true);
      this.push(new Uint8Array(d.buffer));
      this.push(e.name);
      this.offset += 46 + e.name.length;
    }
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, this.entries.length, true);
    end.setUint16(10, this.entries.length, true);
    end.setUint32(12, this.offset - start, true);
    end.setUint32(16, start, true);
    this.push(new Uint8Array(end.buffer));
  }
}
