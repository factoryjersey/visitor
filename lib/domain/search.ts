import type { Image } from '@/lib/db/schema';
import type { Genre } from './genre';

/**
 * One search over everything the site lists: events, tours, experiences
 * and venues,
 * narrowed by kind and, for events and tours, by when. The island is small
 * enough that when matters more than where: the parish is shown, and
 * found when typed, but is not a filter.
 */

/** Tours and experiences are one table, told apart by tourKind. */
export const KINDS = ['events', 'tours', 'experiences', 'venues'] as const;
export type Kind = (typeof KINDS)[number];
export const KIND_LABEL: Record<Kind, string> = { events: 'Events', tours: 'Tours', experiences: 'Experiences', venues: 'Venues' };


/** Kinds chosen together, comma-separated or repeated: any of them. */
export const asKinds = (vs: readonly string[]): Kind[] => KINDS.filter((k) => vs.includes(k));

export type Hit = {
  kind: Kind;
  id: string;
  href: string;
  title: string;
  /** When it is on, for events and tours: "Sat 1 Nov", "Book any day". */
  when: string | null;
  /** Where: the venue or meeting point and parish, as a card gives it. */
  location: string | null;
  /** A second line: who runs a tour, what a venue is. */
  where: string | null;
  price: string | null;
  summary: string | null;
  image: Image | null;
  /** An event's kinds, for the card's icons. */
  types: string[] | null;
  genre: Genre | null;
  /** Ongoing or Regular, on an event's picture. */
  tag: string | null;
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

/** Best answers first; then highlights; then by date or name. */
export function sortHits<T extends Hit>(hits: T[]): T[] {
  // By code point, not locale: ongoing listings are ordered under a leading ~, which a locale puts before the digits.
  const byOrder = (a: Hit, b: Hit) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0);
  return [...hits].sort((a, b) => a.fit - b.fit || Number(b.highlight) - Number(a.highlight) || byOrder(a, b));
}

/** How many of each kind, and in all. */
export function kindCounts(hits: Hit[]): Record<Kind | 'all', number> {
  const counts = { all: hits.length, events: 0, tours: 0, experiences: 0, venues: 0 };
  for (const h of hits) counts[h.kind]++;
  return counts;
}
