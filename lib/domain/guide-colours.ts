/**
 * The Jersey palette (Jersey Brand Guidelines, 2026): eight colours, the
 * blue and light blue, and the green and dark green, leading. Text is only
 * ever deep blue or white (onColour); the other colours are for tabs,
 * rules, chips, markers and panels.
 *
 * The guidelines give RGB and hex only. The CMYK here is converted from RGB
 * for the proof and the InDesign notes; confirm it against Visit Jersey's
 * print values before press.
 */
export type Swatch = { name: string; cmyk: readonly [number, number, number, number]; hex: string };

export const PALETTE = {
  sand: { name: 'sand', cmyk: [0, 1, 10, 4], hex: '#f4f2dc' },
  lightBlue: { name: 'light blue', cmyk: [36, 0, 0, 0], hex: '#a4feff' },
  green: { name: 'green', cmyk: [16, 0, 69, 23], hex: '#a4c43c' },
  orange: { name: 'orange', cmyk: [0, 68, 91, 4], hex: '#f64e16' },
  deepBlue: { name: 'deep blue', cmyk: [97, 23, 0, 76], hex: '#022e3c' },
  blue: { name: 'blue', cmyk: [82, 64, 0, 8], hex: '#2a55eb' },
  darkGreen: { name: 'dark green', cmyk: [65, 0, 63, 68], hex: '#1d521e' },
  maroon: { name: 'maroon', cmyk: [0, 79, 88, 62], hex: '#61140c' },
} as const satisfies Record<string, Swatch>;

/**
 * The guide's sections in the palette: a colour a section, for its tab,
 * rules and chips. Light blue and sand are backgrounds only: as rules on
 * white paper they barely show.
 */
export const SECTION_SWATCHES = {
  Visit: PALETTE.blue,
  See: PALETTE.maroon,
  // The sea's colour. Light blue would be the obvious one, but as rules on white paper it barely shows.
  Beaches: PALETTE.blue,
  Do: PALETTE.deepBlue,
  Buy: PALETTE.maroon,
  Eat: PALETTE.green,
  // The pubs and bars, last in the book: Visit's blue, at the far end from it.
  'Pubs & bars': PALETTE.blue,
} as const satisfies Record<string, Swatch>;

/** The pages that are not venue sections: What's On and New this season in orange, tours in dark green, the maps on light blue. */
export const PAGE_SWATCHES = {
  events: PALETTE.orange,
  tours: PALETTE.darkGreen,
  toursLight: PALETTE.green,
  new: PALETTE.orange,
  maps: PALETTE.lightBlue,
} as const satisfies Record<string, Swatch>;

export type SectionName = keyof typeof SECTION_SWATCHES;

/** Type on a colour: white on the dark ones, deep blue on the light, as the guidelines pair them. */
/**
 * Type on the guide's page markers, chips and numbered markers: white, as
 * the guide sets them, on every colour but the two backgrounds (light blue
 * and sand), where white would vanish and deep blue takes its place.
 */
export function markerText(hex: string): string {
  const h = hex.toLowerCase();
  return h === PALETTE.lightBlue.hex || h === PALETTE.sand.hex ? PALETTE.deepBlue.hex : '#ffffff';
}

export function onColour(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contrast with white against contrast with deep blue (luminance 0.024).
  return (1.05 / (lum + 0.05)) >= ((lum + 0.05) / (0.024 + 0.05)) ? '#ffffff' : PALETTE.deepBlue.hex;
}

/** A section with no colour of its own: a quiet grey, so it shows in the proof as unassigned. */
export const UNASSIGNED: Swatch = { name: 'unassigned', cmyk: [0, 0, 0, 60], hex: '#8a8989' };

const ALIASES: [prefix: string, section: SectionName][] = [
  ['shop', 'Buy'],
  ['attraction', 'Visit'],
  ['eat & drink', 'Eat'],
  ['eat and drink', 'Eat'],
  ['food', 'Eat'],
];

/**
 * The swatch for a section as staff name it on a venue: exactly, by what
 * it starts with ("Eat & Drink: Pubs" is Eat), or by the guide's other
 * names for it (Shop, Shopping: Buy; Attractions: Visit).
 */
export function sectionSwatch(section: string, palette: GuidePalette = 'jersey'): Swatch {
  const swatches = palette === 'classic' ? CLASSIC_SECTION_SWATCHES : SECTION_SWATCHES;
  const s = section.trim().toLowerCase();
  const names = Object.keys(SECTION_SWATCHES) as SectionName[];
  const exact = names.find((n) => n.toLowerCase() === s);
  if (exact) return swatches[exact];
  const alias = ALIASES.find(([p]) => s.startsWith(p));
  if (alias) return swatches[alias[1]];
  const start = names.find((n) => new RegExp(`^${n.toLowerCase()}\\b`).test(s));
  return start ? swatches[start] : UNASSIGNED;
}

/**
 * The guide's colours before the Jersey palette: the 2026 editions' own,
 * read from the summer 2026 edition's tabs. Issue 36 (winter 2026) keeps
 * them; the Jersey palette starts with issue 37 (spring 2027). RGB as
 * printed; the CMYK is converted for the swatch file, to be checked
 * against the old InDesign swatches before press.
 */
const classic = (name: string, hex: string): Swatch => ({ name, hex, cmyk: toCmyk(hex) });
export const CLASSIC = {
  teal: classic('teal', '#77c8d2'),
  fieldGreen: classic('field green', '#b9d478'),
  sandYellow: classic('beach yellow', '#f5ce6e'),
  midnightBlue: classic('midnight blue', '#4965a8'),
  plum: classic('plum', '#b94280'),
  coral: classic('coral', '#f58353'),
  outOut: classic('out out orange', '#f0804c'),
  tourGreen: classic('tour green', '#add581'),
} as const;
export const CLASSIC_SECTION_SWATCHES: Record<SectionName, Swatch> = {
  Visit: CLASSIC.teal,
  See: CLASSIC.fieldGreen,
  Beaches: CLASSIC.sandYellow,
  Do: CLASSIC.midnightBlue,
  Buy: CLASSIC.plum,
  Eat: CLASSIC.fieldGreen,
  'Pubs & bars': CLASSIC.outOut,
};
export const CLASSIC_PAGE_SWATCHES: Record<keyof typeof PAGE_SWATCHES, Swatch> = {
  events: CLASSIC.coral,
  tours: CLASSIC.tourGreen,
  toursLight: CLASSIC.tourGreen,
  new: CLASSIC.coral,
  maps: CLASSIC.sandYellow,
};

/** 'classic': the 2026 editions' colours, to issue 36; 'jersey': the Jersey palette, from issue 37. */
export type GuidePalette = 'classic' | 'jersey';
/** The palette an edition prints in: the classic colours for editions starting before spring 2027 (issue 37). */
export const JERSEY_PALETTE_FROM = '2027-03-01';
export const paletteFor = (window: { from: string }, asked?: string | null): GuidePalette =>
  asked === 'classic' || asked === 'jersey' ? asked : window.from < JERSEY_PALETTE_FROM ? 'classic' : 'jersey';
export const pageSwatches = (palette: GuidePalette) => (palette === 'classic' ? CLASSIC_PAGE_SWATCHES : PAGE_SWATCHES);
/** Every swatch the edition prints in, for the swatch file. */
export const paletteSwatches = (palette: GuidePalette): Swatch[] =>
  [...new Map([...Object.values(palette === 'classic' ? CLASSIC_SECTION_SWATCHES : SECTION_SWATCHES), ...Object.values(pageSwatches(palette)), PALETTE.deepBlue].map((w) => [w.hex, w])).values()];

/** CMYK from RGB, rounded: for the swatch file, to be checked against the press values. */
export function toCmyk(hex: string): [number, number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255) as [number, number, number];
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return [0, 0, 0, 100];
  const f = (c: number) => Math.round(((1 - c - k) / (1 - k)) * 100);
  return [f(r), f(g), f(b), Math.round(k * 100)];
}

/** A tint of a colour on paper, as InDesign tints: the colour at pct %, the rest white. Label chips are at 20 %. */
export function tint(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(255 - (255 - c) * (pct / 100));
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix) as [number, number, number];
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
