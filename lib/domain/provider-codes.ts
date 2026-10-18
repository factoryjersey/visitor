import { normaliseName } from './same-place';

type Seed = { code: string; name: string; website: string | null };
type Candidate = { id: string; name: string; website: string | null; code: string | null };

function domain(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

/** Names as the key prints them and as Visit Jersey does differ in punctuation and spacing only, at best. */
const squash = (s: string) => normaliseName(s).replace(/\s+/g, '');

/**
 * Pair last edition's codes with this edition's providers: by website
 * domain first, since names drift ("Letsgojerseytours" is "Let's Go!
 * Jersey Tours"), then by name. A provider that already has a code keeps
 * it, and no code is given twice.
 */
export function matchCodes<T extends Candidate>(seeds: readonly Seed[], providers: readonly T[]) {
  const assigned = new Map<string, string>();
  const taken = new Set(providers.map((p) => p.code).filter(Boolean));
  const unmatched: Seed[] = [];
  for (const seed of seeds) {
    if (taken.has(seed.code)) continue;
    const d = domain(seed.website);
    const hit = providers.find((p) => !p.code && !assigned.has(p.id) && d !== null && domain(p.website) === d)
      ?? providers.find((p) => !p.code && !assigned.has(p.id) && squash(p.name) === squash(seed.name))
      ?? providers.find((p) => !p.code && !assigned.has(p.id) && squash(p.name).startsWith(squash(seed.name)));
    if (hit) {
      assigned.set(hit.id, seed.code);
      taken.add(seed.code);
    } else {
      unmatched.push(seed);
    }
  }
  return { assigned, unmatched };
}
