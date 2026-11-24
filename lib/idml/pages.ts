import type { Guide } from '@/lib/guide';
import { PALETTE, pageSwatches, sectionSwatch, type GuidePalette } from '@/lib/domain/guide-colours';
import { EVENTS, TOURS } from '@/lib/domain/guide-sections';
import type { GuideEvent, GuideTour, GuideVenue, Layout, VenueCell, VenueSection } from '@/lib/domain/guide-entry';
import { BadgeCheck, Bus, Clock, Info, MapPin, Ticket } from 'lucide-react';
import { iconsFor, type Icon } from '@/components/guide/key-icons';
import { ellipse, iconNode, leftHalfDisc, placed, subpathsOf } from './vector';
import { MM, PAGE_H, PAGE_W, type CharStyle, type InlineShape, type Run, type IdmlMaster, type IdmlPage, type Item, type Para, type ParaStyle, type Swatch } from './write';

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
export type LayoutInput = {
  guide: Guide;
  palette: GuidePalette;
  firstPage: number;
  pictures: Map<string, Picture>;
  opener?: string | null;
  /** Where a section starts in the edition, by its name, when staff set it: it starts there rather than after the one before. */
  starts?: Record<string, number>;
};

const INK = 'Ink';
/** Tripadvisor's green, for their bubbles: a swatch of its own, to match their artwork. */
const TA_GREEN = 'Tripadvisor green';

/** A website icon as an inline shape: its lines, as the proof draws them (1.75 on its 24-unit grid), in the ink at 80%. */
const iconShapes = new Map<string, InlineShape>();
function iconShape(icon: Icon, mm: number, stroke = 1.75, colour?: string, tint?: number): InlineShape {
  const key = `${icon.label}@${mm}@${stroke}@${colour ?? ''}@${tint ?? ''}`;
  const had = iconShapes.get(key);
  if (had) return had;
  const size = mm * MM;
  const scale = size / 24;
  const shape: InlineShape = { width: size, height: size, shapes: [{ subpaths: placed(subpathsOf(iconNode(icon.Icon)), scale, 0, 0), stroke: colour ?? INK, strokeTint: colour ? tint : 80, weight: stroke * scale }] };
  iconShapes.set(key, shape);
  return shape;
}

/** A listing's icons against the frame's right edge, as the proof floats them: a right indent tab, then each icon. */
function iconRuns(icons: Icon[]): Run[] {
  if (!icons.length) return [];
  return [{ text: '', rightTab: true }, ...icons.flatMap((ic, i): Run[] => [...(i ? [{ text: '\u2009' }] : []), { text: '', inline: iconShape(ic, 3) }])];
}

/** Tripadvisor's bubble rating, drawn: five rings in their green, filled to the rating by halves. */
function bubbles(rating: number): InlineShape {
  const d = 2.1 * MM, gap = 0.35 * MM, w = 0.45;
  const r = d / 2 - w / 2;
  const shapes: InlineShape['shapes'] = [];
  const halves = Math.round(rating * 2);
  for (let i = 0; i < 5; i += 1) {
    const cx = d / 2 + i * (d + gap), cy = d / 2;
    const full = halves >= (i + 1) * 2, half = halves === i * 2 + 1;
    shapes.push({ subpaths: [ellipse(cx, cy, r, r)], stroke: TA_GREEN, weight: w, ...(full ? { fill: TA_GREEN } : {}) });
    if (half) shapes.push({ subpaths: [leftHalfDisc(cx, cy, r)], fill: TA_GREEN });
  }
  return { width: 5 * d + 4 * gap, height: d, shapes };
}

/** The key down a page's outer edge, under the tab or the marker: each icon once, an en space, its name. */
function pageKey(items: Item[], icons: Icon[], left: boolean, belowMarker: boolean) {
  const seen = new Map<string, Icon>();
  for (const i of icons) if (!seen.has(i.label)) seen.set(i.label, i);
  if (!seen.size) return;
  const top = belowMarker ? 74.6 : 44;
  items.push({
    kind: 'text', x: left ? 0 : PAGE_W - 3.9, y: top, w: 3.9, h: PAGE_H - 18 - top, vertical: true, centre: true,
    paras: [{ style: 'Page key', runs: [...seen.values()].flatMap((ic, i): Run[] => [...(i ? [{ text: '\u2003' }] : []), { text: '', inline: iconShape(ic, 2.8) }, { text: `\u2002${ic.label}` }]) }],
  });
}
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

/** The text's colour: black, as the 2026 editions print it; the Jersey palette's deep blue from issue 37. */
export const textColour = (palette: GuidePalette) => (palette === 'classic' ? 'Black' : INK);

export function fonts(palette: GuidePalette) {
  return palette === 'classic'
    ? { body: 'Proxima Nova Condensed', plain: 'Proxima Nova', narrow: 'Proxima Nova Extra Condensed', light: 'Light', regular: 'Regular', italic: 'Italic', medium: 'Semibold', mediumItalic: 'Medium Italic', semiboldItalic: 'Semibold Italic', bold: 'Bold', head: 'Proxima Nova Condensed', headStyle: 'Bold' }
    : { body: 'Google Sans Flex', plain: 'Google Sans Flex', narrow: 'Google Sans Flex', light: 'Light', regular: 'Regular', italic: 'Italic', medium: 'Medium', mediumItalic: 'Medium Italic', semiboldItalic: 'Medium Italic', bold: 'Bold', head: 'GT Flaire Extra', headStyle: 'Regular' };
}

/**
 * The styles every frame uses, by name: editing one in InDesign changes them all. The
 * ones the book's What's On already has keep its names (listing body, listings title,
 * photo caption, Page Tab CAPs), so loading the book's styles restyles these pages.
 */
export function styles(palette: GuidePalette): { paraStyles: ParaStyle[]; charStyles: CharStyle[] } {
  const f = fonts(palette);
  const text = textColour(palette);
  const p = (name: string, style: string, size: number, o: Partial<ParaStyle> = {}): ParaStyle => ({ name, font: f.body, style, size, colour: text, ...o });
  const accent = pageSwatches(palette).events.name;
  return {
    paraStyles: [
      /*
       * A listing as the 2026 editions set it (whatson_merge_events_26_3): the date
       * Semibold caps 9/9 in black, the title Bold 9/9 in the section's colour, the
       * copy Regular 8.5 on 8, the venue Bold on 8 and its address and phone in
       * italic (Proxima Nova Extra Condensed) in the section's colour, the website
       * Bold caps in 80% black. Pages set a section's colour on the lines that take it.
       */
      p('When', f.medium, 9, { caps: true, leading: 9 }),
      p('listings title', f.bold, 9, { leading: 9, tracking: -10, before: 0.2, after: 0.2, colour: accent }),
      p('listing body', f.regular, 8.5, { leading: 8 }),
      p('Venue', f.bold, 7.5, { before: 1.6, leading: 8, tracking: -20, colour: accent }),
      p('Address', f.semiboldItalic, 7.5, { font: f.narrow, leading: 8, colour: accent }),
      p('Contact', f.italic, 7.5, { font: f.narrow, leading: 8, tracking: -20, colour: accent }),
      p('Web', f.bold, 7.5, { caps: true, before: 1, leading: 8.5, tint: 80 }),
      p('Venue name', f.medium, 9, { leading: 9.7, after: 0.4 }),
      // The bigger venue entries, as the 2026 Visit pages set them.
      p('Venue title', f.bold, 14, { leading: 15, tracking: -25, after: 1.2 }),
      p('Venue copy', f.regular, 7.5, { font: f.plain, leading: 9, after: 1.6 }),
      p('Venue info', f.regular, 8, { font: f.plain, leading: 9, tint: 80 }),
      p('Venue phone', f.bold, 10, { leading: 12, tracking: -20, before: 1.4 }),
      p('Venue web', f.bold, 9, { leading: 10 }),
      p('Venue label', f.medium, 8, { caps: true, leading: 9, tracking: 20 }),
      p('Tour meta', f.medium, 7, { before: 0.6, leading: 8 }),
      p('Highlight title', f.headStyle, 15, { font: f.head, leading: 15.8, before: 0.5, after: 2 }),
      p('Highlight copy', f.light, 8.5, { leading: 9.8, after: 1.5 }),
      p('Opener title', f.headStyle, 30, { font: f.head, caps: true, leading: 30, colour: 'Paper' }),
      p('photo caption', f.medium, 5.5, { colour: 'Paper', leading: 6.5 }),
      p('Page Tab CAPs', f.medium, 5.2, { caps: true, colour: 'Paper', tracking: 60, align: 'center' }),
      p('Folio', f.medium, 6, { colour: 'Paper', align: 'center' }),
      p('Page key', f.medium, 5, { caps: true, tracking: 20 }),
      p('Running head', f.regular, 7.5, {}),
      p('Footer', f.medium, 7, {}),
      p('Key heading', f.headStyle, 12, { font: f.head, after: 1 }),
      // The provider index: each guide on a line, a hairline in the tours' light green under it, as the proof rules them.
      p('Key line', f.regular, 8, { leading: 10, after: 0.3, ruleBelow: { colour: pageSwatches(palette).toursLight.name, weight: 0.5, offset: 2.2 } }),
      // Looking ahead: the month an attraction opens again hanging in its own column, then its name, its line, and how to visit; a hairline under each.
      p('Ahead intro', f.italic, 9, { tint: 80, after: 3 }),
      p('Ahead name', f.medium, 8, { leading: 10, before: 1.4, leftIndent: 22, firstIndent: -22 }),
      p('Ahead line', f.regular, 8, { leading: 10, leftIndent: 22 }),
      p('Ahead contact', f.italic, 7, { leading: 9, tint: 80, leftIndent: 22, after: 1.4, ruleBelow: { colour: sectionSwatch('Visit', palette).name, weight: 0.5, offset: 1.4 * 72 / 25.4 } }),
      p('Index heading', f.headStyle, 11, { font: f.head, before: 2, after: 1.5 }),
      p('Index line', f.medium, 7.5, { leading: 9 }),
      p('Index more', f.light, 7, { leading: 8.4 }),
    ],
    charStyles: [
      { name: 'Times', style: f.mediumItalic, colour: text, tint: 80 },
      { name: 'Price', style: f.regular, colour: accent },
      { name: 'Tag', style: f.medium, size: 5.5, caps: true },
      { name: 'Code', style: f.bold },
      { name: 'Accent', style: f.medium },
      { name: 'Ahead when', style: f.medium, caps: true },
      { name: 'Standfirst', style: f.bold },
      { name: 'Web inline', style: f.bold, size: 9 },
      { name: 'Info bold', font: f.body, style: f.bold },
      { name: 'Email', font: f.body, style: f.italic, size: 7.5, colour: text, tint: 80 },
      { name: 'Rating', style: f.medium, size: 6.5 },
    ],
  };
}

/** The swatches the frames name: the edition's palette, and the ink. */
export function swatches(palette: GuidePalette, sections: string[]): Swatch[] {
  const page = pageSwatches(palette);
  const all = [...sections.map((s) => sectionSwatch(s, palette)), page.events, page.tours, page.toursLight, page.new];
  return [{ name: INK, cmyk: PALETTE.deepBlue.cmyk }, { name: TA_GREEN, cmyk: [85, 0, 75, 0] }, ...[...new Map(all.map((w) => [w.name, w])).values()].map((w) => ({ name: w.name, cmyk: w.cmyk }))];
}

/*
 * Copy fitted as the proof fits it: each box tries its wordings, fullest
 * first, and takes the first whose paragraphs, wrapped at the box's width
 * in their styles' sizes and leading, fit its height. InDesign cannot be
 * asked, so the lines are estimated from average letter widths, a little
 * wide and the height a little short, so a chosen wording should not overset.
 */
const MM_PER_PT = 25.4 / 72;
const advance = (c: string) => (c === ' ' ? 0.26 : /[A-Z0-9]/.test(c) ? 0.62 : /[il.'’,:;|!]/.test(c) ? 0.25 : /[mwMW]/.test(c) ? 0.8 : 0.52);
function linesOf(text: string, pt: number, widthMm: number, narrow: number): number {
  let lines = 1, at = 0;
  const em = pt * MM_PER_PT * narrow;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const w = [...word].reduce((n, c) => n + advance(c), 0) * em;
    const space = advance(' ') * em;
    if (at > 0 && at + space + w > widthMm) { lines += 1; at = w; } else at += (at > 0 ? space : 0) + w;
  }
  return lines;
}
export function parasHeight(paras: Para[], widthMm: number, style: Map<string, ParaStyle>, narrow: number): number {
  let h = 0;
  for (const p of paras) {
    const st = style.get(p.style);
    const size = p.size ?? st?.size ?? 8;
    const lead = p.leading ?? (st?.leading ?? (st?.size ?? 8) * 1.15) * (size / (st?.size ?? size));
    const text = p.runs.map((r) => (r.inline ? 'MM' : r.rightTab ? '' : r.text)).join('');
    h += (st?.before ?? 0) + linesOf(st?.caps ? text.toUpperCase() : text, size, widthMm, narrow) * lead * MM_PER_PT + (st?.after ?? 0);
  }
  return h;
}

/** Which document of the book a page is for: What's On, Tours and experiences, or the venue sections. */
export type GuidePart = 'events' | 'tours' | 'venues';
export type GuidePage = IdmlPage & { part: GuidePart; section: string };

export function guidePages(input: LayoutInput): { pages: GuidePage[]; masters: IdmlMaster[] } {
  const { guide, palette, pictures } = input;
  const page = pageSwatches(palette);
  const pages: GuidePage[] = [];
  let n = input.starts?.[EVENTS.name] ?? input.firstPage;
  let sectionName = EVENTS.name;
  /** A section begins at the page staff set for it, or on the next left-hand page. */
  const begin = (section: { name: string; colour: string }, after: { name: string; colour: string }) => {
    const at = input.starts?.[section.name];
    if (at) n = at;
    else startLeft(after);
    sectionName = section.name;
  };
  const left = () => n % 2 === 0;
  const pic = (url: string) => (url ? pictures.get(url) : undefined);
  const styleMap = new Map(styles(palette).paraStyles.map((p) => [p.name, p]));
  // Letter widths checked against the proof's sans in the browser (40 of the guide's own texts, each within a line).
  // InDesign sets the 2026 editions in Proxima Nova Condensed, narrower: its lines in the winter pages fit at 0.82 of
  // the estimate at most (a 45.5mm column taking "woodland, rock and sand, making a family-friendly" at 7pt), so 0.8.
  const narrow = palette === 'classic' ? 0.8 : 1;
  /** The fullest wording whose paragraphs fit the box, else the shortest. */
  const fitted = (options: string[], build: (copy: string) => Para[], w: number, h: number): Para[] => {
    const tries = [...new Set(options.filter(Boolean))];
    for (const copy of tries) {
      const paras = build(copy);
      if (parasHeight(paras, w, styleMap, narrow) <= h * 0.97) return paras;
    }
    return build(tries.at(-1) ?? '');
  };

  /*
   * The ears and folio are parent pages (masters), so they are drawn once and
   * changed in one place, and sit on the outside edge whichever side a page
   * falls in the book: A-Folio, the folio; a parent for each section, its tab
   * and word, based on A; and one for each marker under it ("On demand",
   * "St. Helier"), based on its section's.
   */
  const masters: IdmlMaster[] = [];
  const masterOf = new Map<string, IdmlMaster>();
  const ear = (l: boolean) => (l ? -3 : PAGE_W - 3.9);
  const word = (l: boolean) => (l ? 0 : PAGE_W - 3.9);
  const sides = (f: (l: boolean) => Item[]) => ({ left: f(true), right: f(false) });
  masters.push({ id: 'umA', prefix: 'A', name: 'Folio', ...sides((l) => [
    { kind: 'rect', x: ear(l), y: 148.9, w: 6.9, h: 8.1, fill: INK },
    { kind: 'text', x: word(l), y: 148.9, w: 3.9, h: 8.1, vertical: true, centre: true, paras: [{ style: 'Folio', runs: [{ text: '', pageNumber: true }] }] },
  ]) });
  const prefixes = new Set(['A']);
  const prefixFor = (name: string) => {
    const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase();
    for (let k = 1; k <= 3; k += 1) if (!prefixes.has(letters.slice(0, k))) return prefixes.add(letters.slice(0, k)), letters.slice(0, k);
    for (let i = 2; ; i += 1) if (!prefixes.has(`${letters[0]}${i}`)) return prefixes.add(`${letters[0]}${i}`), `${letters[0]}${i}`;
  };
  const sectionMaster = (section: { name: string; colour: string }) => {
    const known = masterOf.get(section.name);
    if (known) return known;
    const prefix = prefixFor(section.name);
    const m: IdmlMaster = { id: `um${prefix}`, prefix, name: section.name, basedOn: 'umA', ...sides((l) => [
      { kind: 'rect', x: ear(l), y: 8.1, w: 6.9, h: 33.9, fill: section.colour },
      { kind: 'text', x: word(l), y: 8.1, w: 3.9, h: 33.9, vertical: true, centre: true, paras: [{ style: 'Page Tab CAPs', runs: [{ text: section.name }] }] },
    ]) };
    masters.push(m);
    masterOf.set(section.name, m);
    return m;
  };
  const markerMaster = (section: { name: string; colour: string }, marker: string) => {
    const key = `${section.name}\u0000${marker}`;
    const known = masterOf.get(key);
    if (known) return known;
    const parent = sectionMaster(section);
    const count = masters.filter((x) => x.basedOn === parent.id).length + 1;
    const prefix = `${parent.prefix}${count}`.slice(0, 4);
    prefixes.add(prefix);
    const tours = section.name === TOURS.name;
    const m: IdmlMaster = { id: `um${prefix}`, prefix, name: `${section.name} ${marker}`, basedOn: parent.id, ...sides((l) => [
      { kind: 'rect', x: ear(l), y: 43.6, w: 6.9, h: 28, fill: tours ? page.toursLight.name : section.colour, tint: tours ? undefined : 60 },
      { kind: 'text', x: word(l), y: 43.6, w: 3.9, h: 28, vertical: true, centre: true, paras: [{ style: 'Page Tab CAPs', runs: [{ text: marker }] }] },
    ]) };
    masters.push(m);
    masterOf.set(key, m);
    return m;
  };
  /** The page's parent: its section's, or its marker's. The page itself carries only its content. */
  let current = 'umA';
  /*
   * The icon key down the outer edge, on a parent page of its own (based on
   * the section's or the marker's): every icon the section's listings use,
   * under the tab or, on a marked page, under the marker. Event and tour
   * grid pages take it; the opener and highlights do not.
   */
  const sectionKeys = new Map<string, Icon[]>([
    [EVENTS.name, [...guide.events, ...guide.ongoing].filter((e) => e.frame !== 'image').flatMap((e) => iconsFor(e))],
    [TOURS.name, guide.tours.filter((t) => t.frame !== 'image').flatMap((t) => iconsFor(t))],
  ]);
  const keyedMaster = (section: { name: string; colour: string }, marker?: string) => {
    const base = marker ? markerMaster(section, marker) : sectionMaster(section);
    const icons = sectionKeys.get(section.name) ?? [];
    if (!icons.length) return base;
    const key = `${section.name}\u0000${marker ?? ''}\u0000key`;
    const known = masterOf.get(key);
    if (known) return known;
    let prefix = `${base.prefix}K`.slice(0, 4);
    for (let i = 2; prefixes.has(prefix); i += 1) prefix = `${base.prefix.slice(0, 2)}K${i}`;
    prefixes.add(prefix);
    const m: IdmlMaster = { id: `um${prefix}`, prefix, name: `${base.name} key`, basedOn: base.id, ...sides((l) => {
      const items: Item[] = [];
      pageKey(items, icons, l, !!marker);
      return items;
    }) };
    masters.push(m);
    masterOf.set(key, m);
    return m;
  };
  const furniture = (_items: Item[], section: { name: string; colour: string }, marker?: string, keyed = false) => {
    current = (keyed ? keyedMaster(section, marker) : marker ? markerMaster(section, marker) : sectionMaster(section)).id;
  };
  let part: GuidePart = 'events';
  const push = (items: Item[]) => {
    pages.push({ n, items, master: current, part, section: sectionName });
    current = 'umA';
    n += 1;
  };
  // A section starts on a left-hand page: a blank page before it, if need be, ends the one before, under its parent page.
  const startLeft = (section: { name: string; colour: string }) => {
    if (!left()) {
      const last = pages.at(-1)?.master;
      if (last) current = last;
      else furniture([], section);
      push([]);
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
  /** The entry's label on its picture ("ATTRACTION"), as the 2026 Visit pages tag them: its section's colour on a light tint of it. */
  const label = (items: Item[], v: GuideVenue, section: { name: string; colour: string }, x: number, y: number) => {
    const text = v.label || (section.name === 'Visit' ? 'ATTRACTION' : '');
    if (!text) return;
    const w = Math.min(40, 4 + text.length * 2.1);
    items.push({ kind: 'text', x, y, w, h: 4.6, fill: section.colour, fillTint: 20, inset: 0.8, centre: true, paras: [{ style: 'Venue label', colour: section.colour, runs: [{ text }] }] });
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
    if (opener) items.push({ kind: 'text', x: 8.1, y: PAGE_H - 10 - 4, w: 80, h: 4, fill: INK, inset: 0.8, paras: [{ style: 'photo caption', runs: [{ text: `${opener.dates} : ‘${opener.title}’` }] }] });
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
    furniture(items, events, marker, true);
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
      items.push({ kind: 'text', x: b.x, y: top, w: b.w, h: b.y + b.h - top, paras: fitted(e.options.length ? e.options : [e.copy], (copy) => [
        { style: 'When', size: s.when, runs: [{ text: e.dates }, ...(e.times ? [{ text: `  ${e.times}`, char: 'Times', size: s.when }] : []), ...iconRuns(iconsFor(e))] },
        { style: 'listings title', size: s.title, colour: events.colour, runs: [{ text: e.title }] },
        ...(copy || e.price ? [{ style: 'listing body', size: s.copy, runs: [{ text: copy }, ...(e.price ? [{ text: ` ${e.price}`, char: 'Price' }] : [])] }] : []),
        ...(e.venue ? [{ style: 'Venue', size: s.small, colour: events.colour, runs: [{ text: '', inline: iconShape({ label: 'Venue', Icon: MapPin }, 2.4, 2.4, events.colour) }, { text: `\u2009${e.venue}` }] }] : []),
        ...small,
      ], b.w, b.y + b.h - top) });
    });
    push(items);
  };
  for (const cells of guide.pages) eventPage(cells);
  for (const cells of guide.ongoingPages) eventPage(cells, 'Ongoing events');

  // Tours: from a left-hand page, the key, then the grid pages.
  const tours = { ...TOURS, colour: page.tours.name };
  if (guide.tours.length) {
    begin(TOURS, events);
    part = 'tours';
    if (guide.providers.length) {
      const perPage = 34;
      const keyPages = Math.max(1, Math.ceil(guide.providers.length / perPage));
      const keyLines: Para[] = [
        { style: 'Key heading', runs: [{ text: 'Tour Guides & Activity Providers' }] },
        ...guide.providers.map((p): Para => ({ style: 'Key line', runs: [{ text: '', inline: iconShape({ label: 'Tour guide', Icon: BadgeCheck }, 2.8) }, { text: '\u2009' }, { text: p.code || '??', char: 'Code' }, { text: `  ${p.name}  ` }, ...(p.contact ? [{ text: `${p.contact}  `, char: 'Price' }] : []), ...(p.website ? [{ text: p.website, char: 'Times' }] : [])] })),
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
      furniture(items, tours, cells[0]?.kind === 'dated' ? 'On specific dates' : 'On demand', true);
      const s = SIZES[grid] ?? SIZES.grid8!;
      cells.forEach((t: GuideTour, i) => {
        const b = cell(grid, i % 2, Math.floor(i / 2));
        if (t.frame === 'image') return image(items, t.imageUrl, b);
        items.push({ kind: 'line', x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y, stroke: page.toursLight.name, weight: 0.6 });
        const when = t.kind === 'dated' ? t.dates : '';
        items.push({ kind: 'text', x: b.x, y: b.y + 1.2, w: b.w, h: b.h - 1.2, paras: fitted(t.options.length ? t.options : [t.copy], (copy) => [
          // Tour dates in 80% grey, as the editor set them.
          ...(when ? [{ style: 'When', size: s.when, colour: textColour(palette), tint: 80, runs: [{ text: when }, ...(t.times ? [{ text: `  ${t.times}`, char: 'Times', size: s.when }] : []), ...iconRuns(iconsFor(t))] }] : []),
          { style: 'listings title', size: s.title, colour: tours.colour, runs: [{ text: t.title }, ...(when ? [] : iconRuns(iconsFor(t)))] },
          ...(!when && t.times ? [{ style: 'Contact', size: s.small, colour: textColour(palette), tint: 80, runs: [{ text: t.times }] }] : []),
          // Tours' copy 7.5 on 8, as the editor set it.
          ...(copy ? [{ style: 'listing body', size: 7.5, leading: 8, runs: [{ text: copy }] }] : []),
          // The provider's code with the tour guide badge (found in the index), and the duration with a clock, as the proof prints them.
          { style: 'Tour meta', size: s.small, runs: [...(t.code ? [{ text: '', inline: iconShape({ label: 'Tour guide', Icon: BadgeCheck }, 2.6) }, { text: '\u2009' }] : []), { text: t.code || t.provider, char: 'Code' }, ...(t.duration ? [{ text: '\u2002' }, { text: '', inline: iconShape({ label: 'Duration', Icon: Clock }, 2.6) }, { text: `\u2009${t.duration}` }] : [])] },
        ], b.w, b.h - 1.2) });
      });
      footer(items, indexLine);
      push(items);
    }
  }

  // The venue sections: each from a left-hand page; full pages, grid pages, then its index.
  for (const vs of guide.sections) venueSection(vs);

  function venueSection(vs: VenueSection) {
    const section = { name: vs.section, colour: sectionSwatch(vs.section, palette).name };
    begin(section, section);
    part = 'venues';
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
        // As the 2026 Visit pages: the picture across the top with its label, the name and copy in a wide column,
        // the details in a narrow one under a rule with an (i), the website large at the foot.
        const parts = venueParts(v, 'full', section.colour, textColour(palette));
        const top = v.imageUrl ? 73.5 : 8.5;
        if (v.imageUrl) {
          image(items, v.imageUrl, { x, y: 8.5, w: 94.9, h: 62 });
          label(items, v, section, x, 8.5 + 62 - 4.6);
        }
        items.push({ kind: 'text', x, y: top, w: 60, h: 141.5 + 8.5 - top - 10, paras: parts.main });
        items.push({ kind: 'line', x1: x + 63.5, y1: top + 2, x2: x + 94.9, y2: top + 2, stroke: section.colour, weight: 0.75 });
        items.push({ kind: 'text', x: x + 63.5 + 31.4 / 2 - 2.4, y: top - 0.4, w: 4.8, h: 4.8, fill: 'Paper', centre: true, paras: [{ style: 'Venue info', runs: [{ text: '', inline: iconShape({ label: 'Info', Icon: Info }, 3.6, 1.75, section.colour) }] }] });
        items.push({ kind: 'text', x: x + 63.5, y: top + 5, w: 31.4, h: 141.5 + 8.5 - top - 15, paras: parts.info });
        if (parts.web.length) items.push({ kind: 'text', x, y: 141.5 + 8.5 - 7, w: 94.9, h: 6, paras: parts.web.map((p) => ({ ...p, size: 12 })) });
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
            if (c.imageUrl) {
              image(items, c.imageUrl, { x: b.x, y: b.y + 1.6, w: half, h: b.h - 1.6 });
              label(items, c, section, b.x, b.y + 1.6);
            }
            items.push({ kind: 'text', x: b.x + half + 3, y: b.y + 1.6, w: half, h: b.h - 1.6, paras: venueParas(c, c.frame, s, section.colour, textColour(palette)) });
          } else if (c.frame === 'half' || c.frame === 'three-quarters') {
            // As the 2026 Visit pages' half pages: the picture on the left with its label, the details beside it,
            // then the name and copy across, and the phone, email and website on a line at the foot.
            const parts = venueParts(c, c.frame, section.colour, textColour(palette));
            const ph = c.frame === 'half' ? 38 : 62;
            const pw = c.imageUrl ? Math.round(b.w * 0.62 * 10) / 10 : 0;
            const y0 = b.y + 1.6;
            if (c.imageUrl) {
              image(items, c.imageUrl, { x: b.x, y: y0, w: pw, h: ph });
              label(items, c, section, b.x, y0);
            }
            const info = parts.info.filter((p) => p.style === 'Venue info' && !p.runs.some((r) => r.char === 'Email'));
            const contact: Para[] = [{ style: 'Venue phone', colour: section.colour, runs: [
              ...(c.phone ? [{ text: c.phone }] : []),
              ...(c.email ? [{ text: `${c.phone ? ' | ' : ''}${c.email}`, char: 'Email' }] : []),
              ...(c.website ? [{ text: `${c.phone || c.email ? '  |  ' : ''}${c.website.toLowerCase()}`, char: 'Web inline' }] : []),
            ] }];
            if (c.imageUrl) items.push({ kind: 'text', x: b.x + pw + 3, y: y0, w: b.w - pw - 3, h: ph, paras: info });
            const below = y0 + (c.imageUrl ? ph + 2 : 0);
            items.push({ kind: 'text', x: b.x, y: below, w: b.w, h: b.y + b.h - below - 7, paras: c.imageUrl ? parts.main : [...parts.main, ...info] });
            items.push({ kind: 'text', x: b.x, y: b.y + b.h - 6, w: b.w, h: 6, paras: contact });
          } else {
            items.push({ kind: 'text', x: b.x, y: b.y + (vs.grid === 'grid16' ? 0.8 : 1.6), w: b.w, h: b.h - 1.6, paras: fitted(c.options.length ? c.options : [c.copy], (copy) => venueParas({ ...c, copy }, 'listing', vs.grid === 'grid16' || vs.grid === 'grid12' ? { ...s, copy: 6.5 } : s, section.colour, textColour(palette)), b.w, b.h - 1.6) });
          }
        }
      }
      // Tripadvisor's attribution where a page prints their ratings, as their brand rules ask: whose, and when.
      const credit = on.some((v) => v.tripadvisor) ? `Tripadvisor traveller ratings, ${RATED_ON}` : '';
      footer(items, [vs.grid !== 'grid12' && vs.grid !== 'grid16' ? areaFoot(on) : '', credit].filter(Boolean).join('      '));
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
    // Looking ahead, after Visit: the attractions closed for some of the edition, in the order they open again, as the proof sets them.
    if (vs.section === 'Visit' && guide.lookingAhead.length) {
      const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const paras: Para[] = [
        { style: 'Key heading', runs: [{ text: 'Looking ahead' }] },
        { style: 'Ahead intro', runs: [{ text: 'Closed for the winter, these attractions open again in the new season.' }] },
        ...guide.lookingAhead.flatMap((r): Para[] => [
          { style: 'Ahead name', runs: [{ text: MONTHS[r.reopens - 1] ?? '', char: 'Ahead when' }, { text: '\t' }, { text: r.name }] },
          ...(r.line ? [{ style: 'Ahead line', runs: [{ text: r.line }] }] : []),
          { style: 'Ahead contact', runs: [{ text: [r.opening, r.phone, r.website].filter(Boolean).join(' · ') }] },
        ]),
      ];
      const count = Math.max(1, Math.ceil((parasHeight(paras, 94.9 - 22, styleMap, narrow) * 1.08) / 141.5));
      for (let i = 0; i < count; i += 1) {
        const items: Item[] = [];
        furniture(items, section, 'Looking ahead');
        items.push({ kind: 'text', x: LEFT_MARGIN(left()), y: 8.5, w: 94.9, h: 141.5, thread: 'looking-ahead', paras: i === 0 ? paras : [] });
        push(items);
      }
    }
  }

  return { pages, masters };
}

/**
 * One document of the book: its pages, and the parent pages they use with the
 * ones those are based on, in order.
 */
export function bookDocument(all: { pages: GuidePage[]; masters: IdmlMaster[] }, parts: GuidePart[] | { section: string }): { pages: IdmlPage[]; masters: IdmlMaster[]; firstPage: number } | null {
  const pages = all.pages.filter((p) => (Array.isArray(parts) ? parts.includes(p.part) : p.section === parts.section));
  if (!pages.length) return null;
  const used = new Set<string>();
  for (const p of pages) for (let m: string | undefined = p.master; m && !used.has(m); m = all.masters.find((x) => x.id === m)?.basedOn) used.add(m);
  return { pages: pages.map(({ part: _p, section: _s, ...page }) => page), masters: all.masters.filter((m) => used.has(m.id)), firstPage: pages[0]!.n };
}

const RATED_ON = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

const spanRows = (c: VenueCell, rows: number) => {
  const share = c.frame === 'three-quarters' ? 3 / 4 : c.frame === 'half' ? 1 / 2 : 1 / 4;
  return c.frame === 'quarter' ? Math.ceil(share * rows) : Math.floor(share * rows);
};

/**
 * A venue's paragraphs. A listing box keeps the listings' styles. The bigger
 * entries are set as the 2026 Visit pages set them (vjvg_26_4_visit): the name
 * in Condensed Bold in the section's colour, the copy in Proxima Nova with its
 * first sentence in Bold, then how to visit in 80% black, each line behind its
 * icon (hours, buses, address), the phone in Condensed Bold and the website in
 * the section's colour, the email in italic.
 */
export function venueParas(v: GuideVenue, frame: string, s: { when: number; title: number; copy: number; small: number }, accent?: string, text = INK): Para[] {
  if (frame === 'listing') {
    const contact = [v.address, v.phone].filter(Boolean).join(' · ');
    return [
      { style: 'Venue name', size: s.title, runs: [{ text: v.printName ?? v.name }, ...(v.isNew ? [{ text: '  NEW', char: 'Tag' }] : []), ...(v.label ? [{ text: `  ${v.label}`, char: 'Tag' }] : []), ...(v.tripadvisor ? [{ text: '  ' }, { text: '', inline: bubbles(v.tripadvisor.rating) }, { text: `\u2009${v.tripadvisor.rating.toFixed(1)}`, char: 'Rating' }] : [])] },
      ...(v.copy ? [{ style: 'listing body', size: s.copy, runs: [...(v.nameSub ? [{ text: `${v.nameSub} `, char: 'Accent' }] : []), { text: v.copy }] }] : []),
      ...(contact ? [{ style: 'Address', size: s.small, ...(accent ? { colour: accent } : {}), runs: [{ text: contact }] }] : []),
      ...(v.website ? [{ style: 'Web', size: s.small, runs: [{ text: v.website }] }] : []),
    ];
  }
  const { main, info, web } = venueParts(v, frame, accent, text);
  return [...main, ...info, ...web];

}

/**
 * A bigger venue entry in its parts, as the 2026 Visit pages lay it out: the
 * name and copy; the details column (price, hours, buses, address, phone,
 * email), each behind its icon; and the website.
 */
export function venueParts(v: GuideVenue, frame: string, accent?: string, text = INK): { main: Para[]; info: Para[]; web: Para[] } {
  const colour = accent ? { colour: accent } : {};
  const icon = (Icon: Icon['Icon'], label: string): Run[] => [{ text: '', inline: iconShape({ label, Icon }, 2.6, 1.75, text, 80) }, { text: '\u2009' }];
  // Its first sentence leads, in Bold, as the 2026 pages open each entry.
  const first = v.copy.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? '';
  const rest = v.copy.slice(first.length).trim();
  return {
    main: [
      { style: 'Venue title', size: frame === 'full' ? 14 : 12, ...colour, runs: [{ text: v.name }, ...(v.isNew ? [{ text: '  NEW', char: 'Tag' }] : []), ...(v.tripadvisor ? [{ text: '  ' }, { text: '', inline: bubbles(v.tripadvisor.rating) }, { text: `\u2009${v.tripadvisor.rating.toFixed(1)}`, char: 'Rating' }] : [])] },
      ...(v.copy ? [{ style: 'Venue copy', runs: [...(first ? [{ text: rest ? `${first} ` : first, char: 'Standfirst' }] : []), ...(rest || !first ? [{ text: rest || v.copy }] : [])] }] : []),
    ],
    info: [
      ...(v.price ? [{ style: 'Venue info', runs: [...icon(Ticket, 'Price'), { text: v.price }] }] : []),
      ...(v.opening ? [{ style: 'Venue info', runs: [...icon(Clock, 'Opening'), { text: v.opening }] }] : []),
      ...(v.bus ? [{ style: 'Venue info', runs: [...icon(Bus, 'Bus'), { text: v.bus }] }] : []),
      ...(v.address ? [{ style: 'Venue info', runs: [...icon(MapPin, 'Address'), { text: v.address, char: 'Info bold' }] }] : []),
      ...(v.phone ? [{ style: 'Venue phone', ...colour, runs: [{ text: v.phone }] }] : []),
      ...(v.email ? [{ style: 'Venue info', runs: [{ text: v.email, char: 'Email' }] }] : []),
    ],
    web: v.website ? [{ style: 'Venue web', ...colour, runs: [{ text: v.website.toLowerCase() }] }] : [],
  };
}
