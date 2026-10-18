import { metresBetween, normaliseName } from './same-place';
import { tidyParish } from './parish';

/**
 * An event's venue, as Visit Jersey gives it, is a free-text address
 * and a pin: "Hamptonne Country Life Museum, Rue de la Patente, Jersey".
 *
 * Linking it to a directory listing by pin alone is wrong in exactly
 * the way docs/visit-jersey.md warns about: Hamptonne Museum's pin is
 * nearest the holiday flat in its stable block, and Jersey Museum's
 * nearest the Royal Yacht across the road. So a listing is the venue
 * only when it is near AND its name is how the venue text begins.
 * Otherwise the event keeps its venue text and a person can link it.
 */

const NEAR_METRES = 250;

/** "Elizabeth Marina, Elizabeth Marina, Castle Street, Saint Helier, Jersey" to "Elizabeth Marina, Castle Street, St Helier". */
export function tidyVenue(text: string | null): string | null {
  if (text === null) return null;
  const parts: string[] = [];
  for (const raw of text.split(',')) {
    const p = tidyParish(raw.trim());
    if (p === '' || /^jersey$/i.test(p)) continue;
    if (parts.some((q) => q.toLowerCase() === p.toLowerCase())) continue;
    parts.push(p);
  }
  return parts.length ? parts.join(', ') : null;
}

type Candidate = { id: string; name: string; lat: number | null; lon: number | null };

export function matchVenue<T extends Candidate>(
  venue: string | null,
  pin: { lat: number | null; lon: number | null },
  places: readonly T[],
): T | null {
  if (venue === null || pin.lat === null || pin.lon === null) return null;
  const text = normaliseName(venue);
  const here = { lat: pin.lat, lon: pin.lon };
  let best: T | null = null;
  for (const p of places) {
    if (p.lat === null || p.lon === null) continue;
    if (metresBetween(here, { lat: p.lat, lon: p.lon }) > NEAR_METRES) continue;
    const name = normaliseName(p.name);
    // Whole words only: "Jersey Museum" begins "Jersey Museum Art Gallery…", but "Jersey" alone matches nothing.
    if (name.split(' ').length < 2 && name.length < 6) continue;
    if (text !== name && !text.startsWith(`${name} `)) continue;
    // The longest name that fits is the most specific listing.
    if (best === null || name.length > normaliseName(best.name).length) best = p;
  }
  return best;
}
