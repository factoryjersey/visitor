/**
 * Whether two listings are one front door. A hotel with a restaurant is
 * listed under both accommodation and food-and-drink; that is one place
 * in the guide, with two source records.
 *
 * Name AND proximity, never either alone: proximity is not identity
 * (Big J Takeaway stands 60m from Jersey Oak), and names repeat across
 * the island. Anything less certain is left as two places for a person
 * to merge.
 */

const NEAR_METRES = 150;

export function normaliseName(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['‘’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function metresBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

type Candidate = { name: string; lat: number | null; lon: number | null };

export function isSamePlace(a: Candidate, b: Candidate): boolean {
  if (normaliseName(a.name) !== normaliseName(b.name)) return false;
  if (a.lat === null || a.lon === null || b.lat === null || b.lon === null) return false;
  return metresBetween({ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon }) <= NEAR_METRES;
}
