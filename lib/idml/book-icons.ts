/**
 * The 2026 editions' own detail icons, as their InDesign pages draw them
 * (taken from vjvg_26_4_visit): the clock for opening hours, the island in a
 * circle for the parish, banknotes for the price, the bus. Each is filled
 * outlines, flattened to one set of paths and drawn inline at the size asked,
 * in the colour asked. The address's compass is drawn from the website's icons.
 */
import data from './book-icons.json';
import type { InlineShape } from './write';
import type { Subpath } from './vector';

export type BookIcon = 'clock' | 'parish' | 'price' | 'bus';
type Stored = { width: number; height: number; shapes: { subpaths: Subpath[]; filled: boolean }[] };
const ICONS = data as unknown as Record<BookIcon, Stored>;
const MM = 72 / 25.4;
const cache = new Map<string, InlineShape>();

/** A book icon as an inline shape, its height in millimetres, filled in the colour and tint given. */
export function bookIcon(name: BookIcon, heightMm: number, colour: string, tint?: number): InlineShape {
  const key = `${name}@${heightMm}@${colour}@${tint ?? ''}`;
  const had = cache.get(key);
  if (had) return had;
  const icon = ICONS[name];
  const k = (heightMm * MM) / icon.height;
  const at = (p: [number, number]): [number, number] => [p[0] * k, p[1] * k];
  const shape: InlineShape = {
    width: icon.width * k,
    height: icon.height * k,
    shapes: icon.shapes.map((s) => ({
      subpaths: s.subpaths.map((sp) => ({ open: sp.open, points: sp.points.map((p) => ({ anchor: at(p.anchor), left: at(p.left), right: at(p.right) })) })),
      fill: colour,
      ...(tint !== undefined ? { fillTint: tint } : {}),
    })),
  };
  cache.set(key, shape);
  return shape;
}
