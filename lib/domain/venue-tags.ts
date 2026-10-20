import { normaliseName } from './same-place';

/**
 * Names from a list (the businesses in a printed guide, our clients)
 * matched to our venues. The same name once normalised is a match; so
 * is a name that is all of one of ours or that ours is all of ("Hotel
 * de France" and "Hotel de France Jersey"), when only one venue fits.
 * Anything else is reported, not guessed.
 */

type Venue = { id: string; name: string };
export type TagMatch = { matched: { name: string; venue: Venue }[]; unmatched: string[]; ambiguous: { name: string; venues: Venue[] }[] };

/** Words that say what a place is rather than which it is: "Jersey", "Ltd", "Hotel". */
const NOISE = /\b(jersey|ltd|limited|the|and)\b/g;
const core = (s: string) => normaliseName(s).replace(NOISE, ' ').replace(/\s+/g, ' ').trim();

export function matchVenueNames(names: string[], venues: Venue[]): TagMatch {
  const out: TagMatch = { matched: [], unmatched: [], ambiguous: [] };
  const byName = new Map<string, Venue[]>();
  for (const v of venues) byName.set(normaliseName(v.name), [...(byName.get(normaliseName(v.name)) ?? []), v]);
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const exact = byName.get(normaliseName(name)) ?? [];
    const loose = exact.length
      ? exact
      : venues.filter((v) => {
          const a = ` ${core(name)} `;
          const b = ` ${core(v.name)} `;
          return a.trim().length > 3 && b.trim().length > 3 && (a.includes(b) || b.includes(a));
        });
    if (loose.length === 1) out.matched.push({ name, venue: loose[0]! });
    else if (loose.length > 1) out.ambiguous.push({ name, venues: loose });
    else out.unmatched.push(name);
  }
  return out;
}
