import type { Guide } from '@/lib/guide';
import { PALETTE, pageSwatches, sectionSwatch, type GuidePalette } from '@/lib/domain/guide-colours';
import { EVENTS, TOURS } from '@/lib/domain/guide-sections';
import type { GuideEvent, GuideTour, GuideVenue, Layout, VenueCell, VenueSection } from '@/lib/domain/guide-entry';
import { PAGE_H, PAGE_W, type CharStyle, type IdmlPage, type Item, type Para, type ParaStyle, type Swatch } from './write';

/**
 * The guide's pages as InDesign frames, placed as the proof places them
 * (app/globals.css): What's On (opener, highlights, the event pages, the
 * ongoing pages), then Tours and experiences (the provider key, then the
 * tour grids), then each venue section (full pages, grid pages, then its
 * index). Text in named styles; pictures linked from Links/.
 *
 * Copy is fitted as the CSV export fits it, by estimate: the proof
 * measures each box in the browser, so a few boxes may need trimming in
 * InDesign, where overset text shows as usual.
 */

export type Picture = { path: string; px?: number; py?: number };
export type LayoutInput = { guide: Guide; palette: GuidePalette; firstPage: number; pictures: Map<string, Picture>; opener?: string | null };

const INK = 'Ink';
const LEFT_MARGIN = (left: boolean) => (left ? 7.9 : 12);
const COL = 45.5;
const GUTTER = 3.9;
const GRID_TOP = 11.6;
const GRID_H = PAGE_H - 11.6 - 11;
const ROWS: Record<string, number[]> = {
  top: [52, 43, 43],
  grid6: [46, 46, 46],
  grid8: [34, 34, 34, 34],
  grid12: [22, 22, 22, 22, 22, 22],
  grid16: [16, 16, 16, 16, 16, 16, 16, 16],
};
const VENUE_GRID16 = Array.from({ length: 8 }, () => (GRID_H - 7) / 8);

/** Type sizes by grid, as the proof sets them: when, title, copy and the small lines. */
const SIZES: Record<string, { when: number; title: number; copy: number; small: number }> = {
  top: { when: 9, title: 9, copy: 8.5, small: 7.5 },
  grid8: { when: 9, title: 9, copy: 8.5, small: 7.5 },
  grid6: { when: 8, title: 8.5, copy: 7, small: 7 },
  grid12: { when: 7, title: 8, copy: 7.5, small: 7 },
  grid16: { when: 6.5, title: 7.5, copy: 7, small: 6.5 },
};

export function fonts(palette: GuidePalette) {
  return palette === 'classic'
    ? { body: 'Proxima Nova Condensed', light: 'Light', regular: 'Regular', medium: 'Semibold', bold: 'Bold', head: 'Proxima Nova Condensed', headStyle: 'Bold' }
    : { body: 'Google Sans Flex', light: 'Light', regular: 'Regular', medium: 'Medium', bold: 'Bold', head: 'GT Flaire Extra', headStyle: 'Regular' };
}

/** The styles every frame uses, by name: editing one in InDesign changes them all. */
export function styles(palette: GuidePalette): { paraStyles: ParaStyle[]; charStyles: CharStyle[] } {
  const f = fonts(palette);
  const p = (name: string, style: string, size: number, o: Partial<ParaStyle> = {}): ParaStyle => ({ name, font: f.body, style, size, colour: INK, ...o });
  return {
    paraStyles: [
      p('When', f.bold, 9, { caps: true, leading: 10 }),
      p('Title', f.medium, 9, { leading: 10, before: 0.2, after: 0.3 }),
      p('Copy', f.light, 8.5, { leading: 9.5 }),
      p('Venue', f.medium, 7.5, { before: 2, leading: 8.6 }),
      p('Address', f.medium, 7.5, { leading: 8.6 }),
      p('Contact', f.regular, 7.5, { leading: 8.6 }),
      p('Web', f.medium, 7.5, { caps: true, before: 1.2, leading: 8.6 }),
      p('Venue name', f.medium, 9, { leading: 10, after: 0.4 }),
      p('Tour meta', f.medium, 7, { before: 0.6, leading: 8 }),
      p('Highlight title', f.headStyle, 15, { font: f.head, leading: 15.8, before: 0.5, after: 2 }),
      p('Highlight copy', f.light, 8.5, { leading: 9.8, after: 1.5 }),
      p('Opener title', f.headStyle, 30, { font: f.head, caps: true, leading: 30, colour: 'Paper' }),
      p('Caption', f.medium, 5.5, { colour: 'Paper', leading: 6.5 }),
      p('Tab', f.medium, 5.2, { caps: true, colour: 'Paper', tracking: 60 }),
      p('Folio', f.medium, 6, { colour: 'Paper' }),
      p('Running head', f.regular, 7.5, {}),
      p('Footer', f.medium, 7, {}),
      p('Key heading', f.headStyle, 12, { font: f.head, after: 1 }),
      p('Key line', f.regular, 8, { leading: 10 }),
      p('Index heading', f.headStyle, 11, { font: f.head, before: 2, after: 1.5 }),
      p('Index line', f.medium, 7.5, { leading: 9 }),
      p('Index more', f.light, 7, { leading: 8.4 }),
    ],
    charStyles: [
      { name: 'Times', style: f.regular, colour: INK },
      { name: 'Price', style: f.medium, colour: INK },
      { name: 'Tag', style: f.medium, size: 5.5, caps: true },
      { name: 'Code', style: f.bold },
      { name: 'Accent', style: f.medium },
    ],
  };
}

/** The swatches the frames name: the edition's palette, and the ink. */
export function swatches(palette: GuidePalette, sections: string[]): Swatch[] {
  const page = pageSwatches(palette);
  const all = [...sections.map((s) => sectionSwatch(s, palette)), page.events, page.tours, page.toursLight, page.new];
  return [{ name: INK, cmyk: PALETTE.deepBlue.cmyk }, ...[...new Map(all.map((w) => [w.name, w])).values()].map((w) => ({ name: w.name, cmyk: w.cmyk }))];
}

export function guidePages(input: LayoutInput): IdmlPage[] {
  const { guide, palette, pictures } = input;
  const page = pageSwatches(palette);
  const pages: IdmlPage[] = [];
  let n = input.firstPage;
  const left = () => n % 2 === 0;
  const pic = (url: string) => (url ? pictures.get(url) : undefined);

  /** The furniture every page has: its section's tab and word, a marker tab under it, the folio. */
  const furniture = (items: Item[], section: { name: string; colour: string }, marker?: string, head?: string) => {
    const l = left();
    const x = l ? -3 : PAGE_W - 3.9;
    items.push({ kind: 'rect', x, y: 8.1, w: 6.9, h: 33.9, fill: section.colour });
    items.push({ kind: 'text', x: l ? 0 : PAGE_W - 3.9, y: 8.1, w: 3.9, h: 33.9, vertical: true, centre: true, paras: [{ style: 'Tab', runs: [{ text: section.name }] }] });
    if (marker) {
      items.push({ kind: 'rect', x, y: 43.6, w: 6.9, h: 28, fill: section.name === TOURS.name ? page.toursLight.name : section.colour, tint: section.name === TOURS.name ? undefined : 60 });
      items.push({ kind: 'text', x: l ? 0 : PAGE_W - 3.9, y: 43.6, w: 3.9, h: 28, vertical: true, centre: true, paras: [{ style: 'Tab', runs: [{ text: marker }] }] });
    }
    items.push({ kind: 'rect', x, y: 148.9, w: 6.9, h: 8.1, fill: INK });
    items.push({ kind: 'text', x: l ? 0 : PAGE_W - 3.9, y: 148.9, w: 3.9, h: 8.1, vertical: true, centre: true, paras: [{ style: 'Folio', runs: [{ text: '', pageNumber: true }] }] });
    if (head !== undefined) items.push({ kind: 'text', x: LEFT_MARGIN(l), y: 3.3, w: 80, h: 4, paras: [{ style: 'Running head', runs: [{ text: `${section.name} `, char: 'Accent' }, { text: head }], colour: undefined }] });
  };
  const push = (items: Item[]) => {
    pages.push({ n, items });
    n += 1;
  };
  const startLeft = (section: { name: string; colour: string }) => {
    if (!left()) {
      const items: Item[] = [];
      furniture(items, section);
      push(items);
    }
  };
  const cell = (grid: string, col: number, row: number, colSpan = 1, rowSpan = 1, rows = ROWS[grid] ?? ROWS.grid8!, gap = 2) => {
    const x = LEFT_MARGIN(left()) + col * (COL + GUTTER);
    const y = GRID_TOP + rows.slice(0, row).reduce((a, b) => a + b, 0) + row * gap;
    const w = colSpan * COL + (colSpan - 1) * GUTTER;
    const h = rows.slice(row, row + rowSpan).reduce((a, b) => a + b, 0) + (rowSpan - 1) * gap;
    return { x, y, w, h };
  };
  const image = (items: Item[], url: string, b: { x: number; y: number; w: number; h: number }) => {
    const p = pic(url);
    items.push({ kind: 'image', ...b, link: p?.path ?? '', px: p?.px, py: p?.py, fill: 'Paper' });
  };
  const footer = (items: Item[], textLine: string) => {
    if (!textLine) return;
    items.push({ kind: 'text', x: left() ? 8.1 : 30, y: PAGE_H - 4.6 - 3.2, w: PAGE_W - 38, h: 3.6, paras: [{ style: 'Footer', runs: [{ text: textLine }] }] });
  };

  // What's On: the opener, the highlights, the event pages, the ongoing pages.
  const events = { ...EVENTS, colour: page.events.name };
  const everyEvent = [...guide.highlights, ...guide.events, ...guide.ongoing];
  const opener = (input.opener ? everyEvent.find((e) => e.title === input.opener && e.imageUrl) : undefined) ?? guide.highlights.find((e) => e.imageUrl) ?? guide.events.find((e) => e.imageUrl);
  if (everyEvent.length) {
    const items: Item[] = [];
    if (opener) image(items, opener.imageUrl, { x: -3, y: -3, w: PAGE_W + 6, h: PAGE_H + 6 });
    else items.push({ kind: 'rect', x: -3, y: -3, w: PAGE_W + 6, h: PAGE_H + 6, fill: events.colour });
    furniture(items, events);
    items.push({ kind: 'text', x: 8.1, y: PAGE_H - 34 - 24, w: 95, h: 24, paras: [{ style: 'Opener title', runs: [{ text: 'Events\nthis season' }] }] });
    if (opener) items.push({ kind: 'text', x: 8.1, y: PAGE_H - 10 - 4, w: 80, h: 4, fill: INK, inset: 0.8, paras: [{ style: 'Caption', runs: [{ text: `${opener.dates} : ‘${opener.title}’` }] }] });
    push(items);
  }
  for (const h of guide.highlights) {
    const items: Item[] = [];
    furniture(items, events);
    const x = LEFT_MARGIN(left());
    if (h.imageUrl) image(items, h.imageUrl, { x, y: 8.5, w: 94.9, h: 62 });
    items.push({ kind: 'text', x, y: h.imageUrl ? 73.5 : 8.5, w: 94.9, h: h.imageUrl ? 70 : 135, paras: [
      { style: 'When', runs: [{ text: h.dates }, ...(h.times ? [{ text: `  ${h.times}`, char: 'Times' }] : [])], colour: events.colour },
      { style: 'Highlight title', runs: [{ text: h.title }], colour: events.colour },
      ...h.extendedCopy.split(/\n{2,}/).filter(Boolean).map((t): Para => ({ style: 'Highlight copy', runs: [{ text: t }] })),
      ...(h.price ? [{ style: 'Venue', runs: [{ text: h.price }] }] : []),
      ...(h.venue ? [{ style: 'Venue', runs: [{ text: h.venue }] }] : []),
      ...(h.address ? [{ style: 'Address', runs: [{ text: h.address }] }] : []),
      ...(h.website ? [{ style: 'Web', runs: [{ text: h.website }] }] : []),
    ] });
    push(items);
  }
  const layout: Layout = guide.layout;
  const eventPage = (cells: GuideEvent[], marker?: string) => {
    const items: Item[] = [];
    furniture(items, events, marker);
    const grid = layout === 'top' ? 'top' : layout;
    const s = SIZES[grid] ?? SIZES.top!;
    cells.forEach((e, i) => {
      const b = cell(grid, i % 2, Math.floor(i / 2));
      if (e.frame === 'image') return image(items, e.imageUrl, b);
      let top = b.y;
      if (e.frame === 'picture') {
        image(items, e.imageUrl, { x: b.x, y: b.y, w: b.w, h: 15.9 });
        items.push({ kind: 'line', x1: b.x, y1: b.y + 15.9, x2: b.x + b.w, y2: b.y + 15.9, stroke: events.colour, weight: 0.6 });
        top = b.y + 18.5;
      } else {
        items.push({ kind: 'line', x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y, stroke: events.colour, weight: 0.6 });
        top = b.y + 1.6;
      }
      const small = grid === 'grid16' ? [] : [
        ...(e.address ? [{ style: 'Address', size: s.small, runs: [{ text: e.address }] }] : []),
        ...(e.contact ? [{ style: 'Contact', size: s.small, runs: [{ text: e.contact }] }] : []),
        ...(e.website ? [{ style: 'Web', size: s.small, runs: [{ text: e.website }] }] : []),
      ];
      items.push({ kind: 'text', x: b.x, y: top, w: b.w, h: b.y + b.h - top, paras: [
        { style: 'When', size: s.when, colour: events.colour, runs: [{ text: e.dates }, ...(e.times ? [{ text: `  ${e.times}`, char: 'Times' }] : [])] },
        { style: 'Title', size: s.title, colour: events.colour, runs: [{ text: e.title }] },
        ...(e.copy || e.price ? [{ style: 'Copy', size: s.copy, runs: [{ text: e.copy }, ...(e.price ? [{ text: ` ${e.price}`, char: 'Price' }] : [])] }] : []),
        ...(e.venue ? [{ style: 'Venue', size: s.small, runs: [{ text: e.venue }] }] : []),
        ...small,
      ] });
    });
    push(items);
  };
  for (const cells of guide.pages) eventPage(cells);
  for (const cells of guide.ongoingPages) eventPage(cells, 'Ongoing events');

  // Tours: from a left-hand page, the key, then the grid pages.
  const tours = { ...TOURS, colour: page.tours.name };
  if (guide.tours.length) {
    startLeft(events);
    if (guide.providers.length) {
      const perPage = 34;
      const keyPages = Math.max(1, Math.ceil(guide.providers.length / perPage));
      const keyLines: Para[] = [
        { style: 'Key heading', runs: [{ text: 'Tour Guides & Activity Providers' }] },
        ...guide.providers.map((p): Para => ({ style: 'Key line', runs: [{ text: p.code || '??', char: 'Code' }, { text: `  ${p.name}  ` }, ...(p.contact ? [{ text: `${p.contact}  `, char: 'Price' }] : []), ...(p.website ? [{ text: p.website, char: 'Times' }] : [])] })),
      ];
      for (let i = 0; i < keyPages; i += 1) {
        const items: Item[] = [];
        furniture(items, tours);
        items.push({ kind: 'text', x: LEFT_MARGIN(left()), y: 8.5, w: 94.9, h: 141.5, thread: 'tour-key', paras: i === 0 ? keyLines : [] });
        push(items);
      }
    }
    const indexLine = guide.providers.length ? 'Tour Guide & Activity Provider Index at the start of this section' : '';
    for (const cells of guide.tourPages ?? []) {
      const items: Item[] = [];
      const grid = cells[0]?.grid ?? 'grid8';
      furniture(items, tours, cells[0]?.kind === 'dated' ? 'On specific dates' : 'On demand');
      const s = SIZES[grid] ?? SIZES.grid8!;
      cells.forEach((t: GuideTour, i) => {
        const b = cell(grid, i % 2, Math.floor(i / 2));
        if (t.frame === 'image') return image(items, t.imageUrl, b);
        items.push({ kind: 'line', x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y, stroke: page.toursLight.name, weight: 0.6 });
        const when = t.kind === 'dated' ? t.dates : '';
        items.push({ kind: 'text', x: b.x, y: b.y + 1.2, w: b.w, h: b.h - 1.2, paras: [
          ...(when ? [{ style: 'When', size: s.when, colour: tours.colour, runs: [{ text: when }, ...(t.times ? [{ text: `  ${t.times}`, char: 'Times' }] : [])] }] : []),
          { style: 'Title', size: s.title, colour: tours.colour, runs: [{ text: t.title }] },
          ...(!when && t.times ? [{ style: 'Contact', size: s.small, runs: [{ text: t.times }] }] : []),
          ...(t.copy ? [{ style: 'Copy', size: s.copy, runs: [{ text: t.copy }] }] : []),
          { style: 'Tour meta', size: s.small, runs: [{ text: t.code || t.provider, char: 'Code' }, ...(t.duration ? [{ text: `   ${t.duration}` }] : [])] },
        ] });
      });
      footer(items, indexLine);
      push(items);
    }
  }

  // The venue sections: each from a left-hand page; full pages, grid pages, then its index.
  for (const vs of guide.sections) venueSection(vs);

  function venueSection(vs: VenueSection) {
    const section = { name: vs.section, colour: sectionSwatch(vs.section, palette).name };
    startLeft(pages.length ? { name: section.name, colour: section.colour } : section);
    const s = SIZES[vs.grid] ?? SIZES.grid8!;
    const areaFoot = (on: GuideVenue[]) => {
      const here = new Set(on.map((v) => v.area));
      return vs.key.filter((k) => here.has(k.area)).map((k) => `${k.code} ${k.area}`).join('   ');
    };
    const marker = (on: GuideVenue[]) => {
      const areas = vs.key.filter((k) => on.some((v) => v.area === k.area)).map((k) => k.area);
      return areas.length <= 2 ? areas.join(' · ') || undefined : `${areas[0]} – ${areas.at(-1)}`;
    };
    for (const p of vs.pages) {
      const items: Item[] = [];
      const on = p.kind === 'full' ? [p.venue] : p.cells;
      furniture(items, section, marker(on));
      if (p.kind === 'full') {
        const v = p.venue;
        const x = LEFT_MARGIN(left());
        if (v.imageUrl) image(items, v.imageUrl, { x, y: 8.5, w: 94.9, h: 62 });
        items.push({ kind: 'text', x, y: v.imageUrl ? 73.5 : 8.5, w: 94.9, h: v.imageUrl ? 70 : 135, paras: venueParas(v, 'full', s) });
      } else {
        const rows = vs.grid === 'grid16' ? VENUE_GRID16 : ROWS[vs.grid] ?? ROWS.grid8!;
        const gap = vs.grid === 'grid16' ? 1 : 2;
        // Placed as the proof's grid places them: in order, a big entry across both columns for its rows, listings two to a row.
        const taken = rows.map(() => [false, false]);
        let cursor = 0;
        for (const c of p.cells) {
          const span = c.frame === 'listing' ? 1 : spanRows(c, rows.length);
          const cols = c.frame === 'listing' ? 1 : 2;
          let at = -1;
          for (let i = cursor; i < rows.length * 2 && at < 0; i += 1) {
            const r = Math.floor(i / 2), col = i % 2;
            if (cols === 2 && col !== 0) continue;
            if (r + span > rows.length) break;
            let free = true;
            for (let rr = r; rr < r + span; rr += 1) for (let cc = col; cc < col + cols; cc += 1) if (taken[rr]![cc]) free = false;
            if (free) at = i;
          }
          if (at < 0) continue;
          const r = Math.floor(at / 2), col = at % 2;
          for (let rr = r; rr < r + span; rr += 1) for (let cc = col; cc < col + cols; cc += 1) taken[rr]![cc] = true;
          cursor = at + cols;
          const b = cell(vs.grid, col, r, cols, span, rows, gap);
          items.push({ kind: 'line', x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y, stroke: section.colour, weight: 0.6 });
          if (c.frame === 'quarter') {
            const half = (b.w - 3) / 2;
            if (c.imageUrl) image(items, c.imageUrl, { x: b.x, y: b.y + 1.6, w: half, h: b.h - 1.6 });
            items.push({ kind: 'text', x: b.x + half + 3, y: b.y + 1.6, w: half, h: b.h - 1.6, paras: venueParas(c, c.frame, s) });
          } else if (c.frame === 'half' || c.frame === 'three-quarters') {
            const ph = c.frame === 'half' ? 38 : 62;
            if (c.imageUrl) image(items, c.imageUrl, { x: b.x, y: b.y + 1.6, w: b.w, h: ph });
            items.push({ kind: 'text', x: b.x, y: b.y + 1.6 + (c.imageUrl ? ph + 2 : 0), w: b.w, h: b.h - 1.6 - (c.imageUrl ? ph + 2 : 0), paras: venueParas(c, c.frame, s) });
          } else {
            items.push({ kind: 'text', x: b.x, y: b.y + (vs.grid === 'grid16' ? 0.8 : 1.6), w: b.w, h: b.h - 1.6, paras: venueParas(c, 'listing', vs.grid === 'grid16' ? { ...s, copy: 6.5 } : s) });
          }
        }
      }
      if (vs.grid !== 'grid12' && vs.grid !== 'grid16') footer(items, areaFoot(on));
      push(items);
    }
    // Its index: the directory lines, by area, flowing over as many pages as they need.
    if (vs.directory.length) {
      const lines: Para[] = [];
      let area = '';
      for (const v of vs.directory) {
        if (v.area !== area) {
          area = v.area;
          lines.push({ style: 'Index heading', runs: [{ text: area || vs.section }] });
        }
        lines.push({ style: 'Index line', runs: [{ text: v.areaCode ? `${v.areaCode}  ` : '', char: 'Code' }, { text: v.name }] });
        const more = [v.label && v.label.charAt(0) + v.label.slice(1).toLowerCase(), v.phone || v.website].filter(Boolean).join(' · ');
        if (more) lines.push({ style: 'Index more', runs: [{ text: more }] });
      }
      const perPage = 56;
      const count = Math.max(1, Math.ceil(lines.length / perPage));
      for (let i = 0; i < count; i += 1) {
        const items: Item[] = [];
        furniture(items, section, 'Index');
        const x = LEFT_MARGIN(left());
        items.push({ kind: 'text', x, y: 8.5, w: COL, h: 141.5, thread: `index-${vs.section}`, paras: i === 0 ? lines : [] });
        items.push({ kind: 'text', x: x + COL + GUTTER, y: 8.5, w: COL, h: 141.5, thread: `index-${vs.section}`, paras: [] });
        push(items);
      }
    }
  }

  return pages;
}

const spanRows = (c: VenueCell, rows: number) => {
  const share = c.frame === 'three-quarters' ? 3 / 4 : c.frame === 'half' ? 1 / 2 : 1 / 4;
  return c.frame === 'quarter' ? Math.ceil(share * rows) : Math.floor(share * rows);
};

function venueParas(v: GuideVenue, frame: string, s: { when: number; title: number; copy: number; small: number }): Para[] {
  const contact = [v.address, v.phone].filter(Boolean).join(' · ');
  return [
    { style: 'Venue name', size: frame === 'full' ? 15 : frame === 'listing' ? s.title : 10.5, runs: [{ text: v.name }, ...(v.isNew ? [{ text: '  NEW', char: 'Tag' }] : []), ...(v.label ? [{ text: `  ${v.label}`, char: 'Tag' }] : []), ...(v.tripadvisor ? [{ text: `  Tripadvisor ${v.tripadvisor.rating.toFixed(1)}`, char: 'Tag' }] : [])] },
    ...(v.copy ? [{ style: 'Copy', size: frame === 'listing' ? s.copy : 8.5, runs: [{ text: v.copy }] }] : []),
    ...(contact ? [{ style: 'Address', size: s.small, runs: [{ text: contact }] }] : []),
    ...(v.website ? [{ style: 'Web', size: s.small, runs: [{ text: v.website }] }] : []),
    ...(v.bus ? [{ style: 'Contact', size: s.small, runs: [{ text: `Bus ${v.bus}` }] }] : []),
  ];
}
