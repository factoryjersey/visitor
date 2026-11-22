import { type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth/session';
import { iconsFor } from '@/components/guide/key-icons';
import { aseFile } from '@/lib/domain/ase';
import { toCsv, utf16le } from '@/lib/domain/csv';
import { paletteFor, paletteSwatches } from '@/lib/domain/guide-colours';
import { layoutsFrom } from '@/lib/domain/guide-entry';
import { buildGuide, EVENT_COLUMNS, HIGHLIGHT_COLUMNS, isDraft, PROVIDER_COLUMNS, TOUR_COLUMNS, VENUE_COLUMNS, windowFrom } from '@/lib/guide';
import { ZipWriter } from '@/lib/zip';
import { bookDocument, guidePages, styles, swatches, type Picture } from '@/lib/idml/pages';
import { idmlFiles } from '@/lib/idml/write';
import { asJpeg, imageSize } from '@/lib/idml/image-size';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * The edition as an InDesign package, in one zip: the Data Merge sources,
 * every picture they use at full size in Links/, each named in the CSVs'
 * @Picture column (the column InDesign places pictures from), the
 * edition's swatches as an .ase file for the Swatches panel, and notes.
 * Built and sent as it goes, the pictures fetched a few at a time.
 */
export async function GET(request: NextRequest) {
  await requireStaff();
  const sp = request.nextUrl.searchParams;
  const window = windowFrom({ from: sp.get('from') ?? undefined, to: sp.get('to') ?? undefined });
  const palette = paletteFor(window, sp.get('palette'));
  const guide = await buildGuide(window, { draft: isDraft(sp.get('draft')), layouts: layoutsFrom((k) => sp.get(k)) });

  // One file a picture, named from what it shows, the same name wherever it is used.
  const links = new Map<string, string>();
  const taken = new Set<string>();
  const link = (url: string, title: string) => {
    if (!url) return '';
    const had = links.get(url);
    if (had) return had;
    const ext = asJpeg(url) !== url ? 'jpg' : (/\.(jpe?g|png|webp|gif|tiff?)(?:$|\?)/i.exec(url)?.[1] ?? 'jpg').toLowerCase().replace('jpeg', 'jpg');
    const stem = title.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 60) || 'picture';
    let name = `${stem}.${ext}`;
    for (let i = 2; taken.has(name); i += 1) name = `${stem}-${i}.${ext}`;
    taken.add(name);
    links.set(url, `Links/${name}`);
    return `Links/${name}`;
  };

  const events = [...guide.events, ...guide.ongoing];
  const csvs: [string, string][] = [
    ['highlights.csv', toCsv([...HIGHLIGHT_COLUMNS, '@Picture'], guide.highlights.map((e) => [e.dates, e.times, e.title, e.extendedCopy, e.price, e.venue, e.address, e.contact, e.website, e.imageUrl, link(e.imageUrl, e.title)]))],
    ['whats-on.csv', toCsv([...EVENT_COLUMNS, '@Picture'], events.map((e) => e.frame === 'image'
      ? [e.frame, '', '', e.title, '', '', '', '', '', '', e.imageUrl, e.block, '', link(e.imageUrl, e.title)]
      : [e.frame, e.dates, e.times, e.title, e.copy, e.price, e.venue, e.address, e.contact, e.website, e.frame === 'picture' ? e.imageUrl : '', e.block, iconsFor(e).map((i) => i.label).join(', '), e.frame === 'picture' ? link(e.imageUrl, e.title) : '']))],
    ['tours.csv', toCsv([...TOUR_COLUMNS, '@Picture'], guide.tours.map((t) => t.frame === 'image'
      ? [t.kind, t.genre, '', t.title, '', '', '', '', '', 'image', t.imageUrl, '', link(t.imageUrl, t.title)]
      : [t.kind, t.genre, t.dates, t.title, t.code, t.duration, t.times, t.copy, t.provider, t.grid ? 'listing' : '', '', iconsFor(t).map((i) => i.label).join(', '), '']))],
    ['providers.csv', toCsv(PROVIDER_COLUMNS, guide.providers.map((p) => [p.code, p.name, p.contact, p.website]))],
    ['venues.csv', toCsv([...VENUE_COLUMNS, '@Picture'], guide.venues.map((v) => {
      const frame = 'frame' in v ? String(v.frame) : v.size === 'full' ? 'full' : 'directory';
      const pictured = frame !== 'listing' && frame !== 'directory';
      return [v.section, v.area, v.areaCode ?? '', v.name, v.label, v.size, frame, v.copy, v.address, v.phone, v.email, v.website, v.imageUrl, v.tripadvisor ? v.tripadvisor.rating.toFixed(1) : '', v.tripadvisor?.image ?? '', pictured ? link(v.imageUrl, v.name) : ''];
    }))],
  ];

  const job = `visitor-guide_${window.from}_${window.to}`;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const zip = new ZipWriter((c) => controller.enqueue(c));
      for (const [name, csv] of csvs) zip.add(`${job}/${name}`, utf16le(csv));
      const group = palette === 'classic' ? 'Visitor Guide 2026 editions (to issue 36)' : 'Visitor Guide Jersey palette (from issue 37)';
      zip.add(`${job}/swatches.ase`, aseFile(group, paletteSwatches(palette)));
      const missing: string[] = [];
      // Every picture the pages use, the opener and the venues' too, as the CSVs name them.
      for (const e of [...guide.highlights, ...events]) if (e.imageUrl) link(e.imageUrl, e.title);
      for (const t of guide.tours) if (t.imageUrl) link(t.imageUrl, t.title);
      for (const v of guide.venues) if (v.imageUrl) link(v.imageUrl, v.name);
      const queue = [...links.entries()];
      const pictures = new Map<string, Picture>();
      const fetchOne = async ([url, path]: [string, string]) => {
        try {
          const res = await fetch(asJpeg(url), { signal: AbortSignal.timeout(30_000) });
          if (!res.ok) throw new Error(String(res.status));
          const bytes = new Uint8Array(await res.arrayBuffer());
          const size = imageSize(bytes);
          if (!size) missing.push(`${path}  ${url}  (not JPEG or PNG: InDesign cannot place it; save it as JPEG)`);
          pictures.set(url, { path, ...(size ? { px: size.px, py: size.py } : {}) });
          zip.add(`${job}/${path}`, bytes);
        } catch (e) {
          missing.push(`${path}  ${url}  (${(e as Error).message})`);
        }
      };
      const workers = Array.from({ length: 6 }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) await fetchOne(next);
      });
      await Promise.all(workers);
      // The pages themselves, as an InDesign document beside Links/.
      const firstPage = Math.max(1, Math.min(400, Number(sp.get('page')) || 36));
      const sectionNames = guide.sections.map((s) => s.section);
      // The book's documents, as the editions name them (vjvg_26_4: the fourth of 2026, winter): What's On and Tours to replace the merge files, the venue sections, and the whole run in one.
      const [yy, mm] = [window.from.slice(2, 4), Number(window.from.slice(5, 7))];
      const issue = `${yy}_${mm >= 12 || mm < 3 ? 4 : mm >= 9 ? 3 : mm >= 6 ? 2 : 1}`;
      const laid = guidePages({ guide, palette, firstPage, pictures, opener: sp.get('opener') });
      const shared = { ...styles(palette), swatches: swatches(palette, sectionNames) };
      const docs: [string, ReturnType<typeof bookDocument>][] = [
        [`whatson_events_${issue}.idml`, bookDocument(laid, ['events'])],
        [`whatson_tours_${issue}.idml`, bookDocument(laid, ['tours'])],
        [`vjvg_venues_${issue}.idml`, bookDocument(laid, ['venues'])],
        [`${job}.idml`, bookDocument(laid, ['events', 'tours', 'venues'])],
      ];
      for (const [file, doc] of docs) {
        if (!doc) continue;
        const idml: Uint8Array[] = [];
        const inner = new ZipWriter((c) => idml.push(c));
        for (const [name, body] of idmlFiles({ ...doc, ...shared })) inner.add(name, new TextEncoder().encode(body));
        inner.finish();
        const idmlBytes = new Uint8Array(idml.reduce((n, c) => n + c.length, 0));
        idml.reduce((at, c) => (idmlBytes.set(c, at), at + c.length), 0);
        zip.add(`${job}/${file}`, idmlBytes);
      }
      const readme = [
        `Visitor Guide, ${window.from} to ${window.to}: InDesign package`,
        '',
        `whatson_events_${issue}.idml and whatson_tours_${issue}.idml: What's On and Tours and experiences, for the book in place of the merge files; vjvg_venues_${issue}.idml: the venue sections; ${job}.idml: all of them in one. Open each in InDesign (File > Open) and save as .indd. Every frame is in place, text in named paragraph styles, pictures linked from Links/. Copy is fitted by estimate: check for overset text. Fonts: ${palette === 'classic' ? 'Proxima Nova Condensed' : 'Google Sans Flex and GT Flaire Extra'}.`,
        `The ears are parent pages, on their own layer (Ears) above the pages': A-Folio carries the folio; each section's parent (E-What's On, T-Tours…) its tab, based on A; each marker's (E1, T1…) its marker tab, based on its section's. Change an ear once on its parent and every page follows; they stay on the outside edge whichever side a page falls in the book. Each document starts at its page in the edition (What's On at ${firstPage}): set the book to keep each document's own numbering.`,
        'highlights.csv, whats-on.csv, tours.csv, providers.csv, venues.csv: Data Merge sources (UTF-16), in page order.',
        'The @Picture column names each picture in Links/: keep Links/ beside the CSVs and Data Merge places them.',
        `swatches.ase: the edition's colours (${group}), as global CMYK swatches. Swatches panel > Load Swatches. CMYK converted from RGB: check before press.`,
        '',
        `${links.size - missing.length} of ${links.size} pictures included.`,
        ...(missing.length ? ['', 'Not fetched (use the URL):', ...missing] : []),
        '',
      ].join('\r\n');
      zip.add(`${job}/README.txt`, new TextEncoder().encode(readme));
      zip.finish();
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${job}.zip"` },
  });
}
