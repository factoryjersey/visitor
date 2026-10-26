import type { Image } from '@/lib/db/schema';
import { PARISHES, parishOf } from './parish';

/**
 * One search over everything the site lists: events, tours and venues,
 * narrowed by kind and by area. An area is a parish, the way the island
 * thinks of where things are. Each choice is counted from what the other
 * leaves, so the numbers on the tabs and the chips are what a tap shows.
 */

export const KINDS = ['events', 'tours', 'venues'] as const;
export type Kind = (typeof KINDS)[number];
export const KIND_LABEL: Record<Kind, string> = { events: 'Events', tours: 'Tours', venues: 'Venues' };

export const asKind = (v: string | undefined): Kind | undefined => (KINDS as readonly string[]).includes(v ?? '') ? (v as Kind) : undefined;

export type Hit = {
  kind: Kind;
  id: string;
  href: string;
  title: string;
  /** The parish, as parish.ts spells it ("St Brelade"), or null if we do not know it. */
  area: string | null;
  /** When it is on, for events and tours: "Sat 1 Nov", "Book any day". */
  when: string | null;
  /** Where, or what: the venue, who runs a tour, what a venue is. */
  line: string | null;
  image: Image | null;
  highlight: boolean;
  /** How well the title answers the search: lower is better. */
  fit: number;
  /** Its place within its kind once fit is equal: the next date, or the name. */
  order: string;
};

/** The words typed, lower case, each once: every one must be found somewhere. */
export function searchWords(q: string | undefined): string[] {
  if (!q) return [];
  const words = q
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
  return [...new Set(words)].slice(0, 8);
}

/** A word as a literal inside an ILIKE pattern: % and _ match only themselves. */
export const likeEscape = (w: string) => w.replace(/[\\%_]/g, (c) => `\\${c}`);

const plain = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * 0: the title starts with what was typed. 1: every word is in the title.
 * 2: some are. 3: it matched on something else (the venue, the parish, the
 * description). With nothing typed, everything fits equally.
 */
export function fit(title: string, words: string[]): number {
  if (!words.length) return 0;
  const t = plain(title);
  if (t.startsWith(plain(words.join(' ')))) return 0;
  const inTitle = words.filter((w) => t.includes(plain(w))).length;
  return inTitle === words.length ? 1 : inTitle > 0 ? 2 : 3;
}

export const areaSlug = (parish: string) => parish.toLowerCase().replace(/\s+/g, '-');
export const areaFromSlug = (slug: string | undefined): string | null => (slug ? (PARISHES.find((p) => areaSlug(p) === slug) ?? null) : null);
/** The parish from however a listing spells it. */
export const areaOf = (...labels: (string | null | undefined)[]): string | null => labels.map(parishOf).find(Boolean) ?? null;

/** Best answers first; then highlights; then by date or name. */
export function sortHits<T extends Hit>(hits: T[]): T[] {
  return [...hits].sort((a, b) => a.fit - b.fit || Number(b.highlight) - Number(a.highlight) || a.order.localeCompare(b.order));
}

export function narrow<T extends Hit>(hits: T[], o: { kind?: Kind; area?: string | null }): T[] {
  return hits.filter((h) => (!o.kind || h.kind === o.kind) && (!o.area || h.area === o.area));
}

/** How many of each kind, in the area chosen. */
export function kindCounts(hits: Hit[], area: string | null): Record<Kind | 'all', number> {
  const inArea = narrow(hits, { area });
  const counts = { all: inArea.length, events: 0, tours: 0, venues: 0 };
  for (const h of inArea) counts[h.kind]++;
  return counts;
}

/** The parishes with something of the kind chosen, in the island's order, each with its count. The one chosen stays, even at none. */
export function areaCounts(hits: Hit[], kind: Kind | undefined, chosen: string | null): { area: string; slug: string; n: number }[] {
  const n = new Map<string, number>();
  for (const h of narrow(hits, { kind })) if (h.area) n.set(h.area, (n.get(h.area) ?? 0) + 1);
  return PARISHES.filter((p) => n.has(p) || p === chosen).map((p) => ({ area: p, slug: areaSlug(p), n: n.get(p) ?? 0 }));
}
