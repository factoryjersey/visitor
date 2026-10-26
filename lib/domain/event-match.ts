import type { EventDate } from '@/lib/db/schema';
import { normaliseName } from './same-place';

/**
 * Whether an event from one source is one we already have from another.
 *
 * The same night is listed by Visit Jersey as "Seven Drunken Nights – The
 * Story of The Dubliners", by the Opera House as "Seven Drunken Nights:
 * The Story of the Dubliners" and on Eventbrite with the venue appended.
 * So: at least one date in common, and titles that share most of their
 * words. A shared date with a weak title match is a different event at a
 * busy venue; a strong title match on different dates is a different run.
 */

const NOISE = new Set(['the', 'a', 'an', 'and', 'of', 'at', 'in', 'on', 'for', 'with', 'to', 'jersey', 'presents', 'live', 'tickets', '2025', '2026', '2027']);

export function titleWords(title: string): Set<string> {
  return new Set(normaliseName(title).split(' ').filter((w) => w.length > 1 && !NOISE.has(w)));
}

/** Words in common over words in the shorter title: "Dubliners" alone does not make two titles one. */
export function titleSimilarity(a: string, b: string): number {
  const x = titleWords(a);
  const y = titleWords(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared += 1;
  return shared / Math.min(x.size, y.size);
}

type Candidate = { id: string; title: string; dates: readonly EventDate[]; placeId?: string | null };

export function findSameEvent<T extends Candidate>(incoming: { title: string; dates: readonly EventDate[]; placeId?: string | null }, existing: readonly T[]): T | null {
  const days = new Set(incoming.dates.map((d) => d.date));
  let best: { e: T; score: number } | null = null;
  for (const e of existing) {
    if (!e.dates.some((d) => days.has(d.date))) continue;
    const score = titleSimilarity(incoming.title, e.title);
    const sameVenue = !!incoming.placeId && incoming.placeId === e.placeId;
    if (score < (sameVenue ? 0.5 : 0.75)) continue;
    if (!best || score > best.score) best = { e, score };
  }
  return best?.e ?? null;
}
