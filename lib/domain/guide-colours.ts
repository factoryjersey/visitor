/**
 * The venue sections' colours: one swatch a section, for its tab and
 * everything in its entries (names, rules, labels, phone, directory).
 * CMYK as the 2026 InDesign files define the swatches; hex as they print
 * (FOGRA39 to sRGB), for the proof on screen.
 *
 * Eat is the field green as the spring edition printed it (K 28). The
 * swatch in the InDesign file is K 0 (#bbd47b), which prints much paler;
 * change it here if that is the one wanted.
 */
export type Swatch = { name: string; cmyk: readonly [number, number, number, number]; hex: string };

export const SECTION_SWATCHES = {
  Visit: { name: 'surf teal', cmyk: [55, 0, 20, 0], hex: '#78c9d2' },
  See: { name: 'dune yellow', cmyk: [5, 20, 66, 0], hex: '#f5ce6f' },
  Do: { name: 'midnight blue', cmyk: [78.82, 59.9, 5.35, 0.06], hex: '#4e69a9' },
  Buy: { name: 'rich plum', cmyk: [30, 85, 18, 0], hex: '#bb4983' },
  Eat: { name: 'field green', cmyk: [35, 0, 65, 28], hex: '#93a962' },
} as const satisfies Record<string, Swatch>;

export type SectionName = keyof typeof SECTION_SWATCHES;

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
export function sectionSwatch(section: string): Swatch {
  const s = section.trim().toLowerCase();
  const names = Object.keys(SECTION_SWATCHES) as SectionName[];
  const exact = names.find((n) => n.toLowerCase() === s);
  if (exact) return SECTION_SWATCHES[exact];
  const alias = ALIASES.find(([p]) => s.startsWith(p));
  if (alias) return SECTION_SWATCHES[alias[1]];
  const start = names.find((n) => new RegExp(`^${n.toLowerCase()}\\b`).test(s));
  return start ? SECTION_SWATCHES[start] : UNASSIGNED;
}

/** A tint of a colour on paper, as InDesign tints: the colour at pct %, the rest white. Label chips are at 20 %. */
export function tint(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(255 - (255 - c) * (pct / 100));
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix) as [number, number, number];
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
