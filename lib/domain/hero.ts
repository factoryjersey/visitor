import type { Image } from '@/lib/db/schema';
import { UNIQUE, type Occurrence } from '@/lib/domain/occurrence';

/**
 * Which events lead the front page. Highlights first, then festivals,
 * then other unique events to make up the number, each with its own
 * photo: two listings from the same organiser often share one, and the
 * same picture twice in a rotation reads as a mistake.
 */

type HeroCandidate = {
  title: string;
  highlight: boolean;
  occurrence: Occurrence;
  eventTypes: readonly string[];
  headerImage: Image | null;
};

export const HERO_SLIDES = 5;

const FESTIVAL = /festival/i;

export function isFestival(e: Pick<HeroCandidate, 'title' | 'eventTypes'>): boolean {
  return FESTIVAL.test(e.title) || e.eventTypes.some((t) => FESTIVAL.test(t));
}

/** The same photo: Cloudinary's id where we have it, else the original upload's URL. */
export function imageKey(img: Image): string {
  return img.publicId ?? img.url.split('?')[0]!;
}

/** In date order, as given; returns at most `max`, no photo used twice. */
export function heroPicks<T>(rows: readonly T[], event: (row: T) => HeroCandidate, max = HERO_SLIDES): T[] {
  const tiers = [
    (e: HeroCandidate) => e.highlight,
    (e: HeroCandidate) => isFestival(e) && UNIQUE.includes(e.occurrence),
    (e: HeroCandidate) => UNIQUE.includes(e.occurrence),
  ];
  const picked: T[] = [];
  const seen = new Set<string>();
  for (const tier of tiers) {
    for (const row of rows) {
      if (picked.length >= max) return picked;
      const e = event(row);
      if (!e.headerImage || picked.includes(row) || !tier(e)) continue;
      const key = imageKey(e.headerImage);
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(row);
    }
  }
  return picked;
}
