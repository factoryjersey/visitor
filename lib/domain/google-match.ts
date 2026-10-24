import { metresBetween, normaliseName } from './same-place';

/**
 * Which of Google's answers to a name search is our venue. Google's names
 * run longer than ours ("The Atlantic Hotel" is "Atlantic Hotel Jersey"
 * there), so the names need only share their words, not match; but the
 * place must also be where we have it, within a few hundred metres. A
 * venue we have no pin for needs the name whole and an address in Jersey.
 * Anything less certain stays unmatched for a person to set.
 */
export type GoogleCandidate = { id: string; name: string; address: string; lat: number | null; lon: number | null };
type Ours = { name: string; lat: number | null; lon: number | null };

const NEAR_METRES = 300;
/** Words that say what a place is, not which: two hotels share "hotel". */
const GENERIC = new Set(['and', 'of', 'at', 'jersey', 'st', 'saint', 'hotel', 'restaurant', 'bar', 'cafe', 'the', 'ltd', 'limited', 'channel', 'islands']);

const words = (name: string) => normaliseName(name).split(' ').filter((w) => w && !GENERIC.has(w));

/** How much of the shorter name's telling words the other has: 1 when one name's words all appear in the other. */
export function nameOverlap(a: string, b: string): number {
  const wa = new Set(words(a));
  const wb = new Set(words(b));
  if (!wa.size || !wb.size) return normaliseName(a) === normaliseName(b) ? 1 : 0;
  const shared = [...wa].filter((w) => wb.has(w)).length;
  return shared / Math.min(wa.size, wb.size);
}

export function pickGooglePlace(ours: Ours, candidates: GoogleCandidate[]): GoogleCandidate | null {
  const scored = candidates
    .map((c) => {
      const overlap = nameOverlap(ours.name, c.name);
      const near = ours.lat !== null && ours.lon !== null && c.lat !== null && c.lon !== null ? metresBetween({ lat: ours.lat, lon: ours.lon }, { lat: c.lat, lon: c.lon }) : null;
      const ok = near !== null ? overlap >= 0.5 && near <= NEAR_METRES : overlap === 1 && /\bjersey\b|\bJE\d/i.test(c.address);
      return { c, overlap, near, ok };
    })
    .filter((x) => x.ok)
    .sort((a, b) => b.overlap - a.overlap || (a.near ?? 0) - (b.near ?? 0));
  return scored[0]?.c ?? null;
}
