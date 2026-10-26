import type { Genre } from './genre';

/**
 * A tour takes you somewhere with a guide or a route: a walk, a trail, a
 * boat trip, a bus round the island. An experience is something you do or
 * try in one place: paintball, a zip wire, a masterclass, a tasting, an
 * open day. Nothing in the source says which, so it is read the way a
 * visitor would: the title first, as providers name a tour a tour; then
 * Visit Jersey's types, whose tour kinds end in "tours" and whose classes
 * are "Activity sessions & classes"; then our genre. Tested against
 * Visit Jersey's own list, in tests/tour-kind.test.ts.
 */
export type TourKind = 'tour' | 'experience';

const TOUR_WORDS = /\btours?\b|\bwalk(s|ing)?\b|\btrails?\b|\bvoyages?\b|seafaris?\b|\bday trip\b|\bcruises?\b|\bexcursions?\b|\bpilgrimages?\b|\bguided\b/i;
const EXPERIENCE_WORDS = /\bexperiences?\b|masterclass|\bclass(es)?\b|\bsessions?\b|\bworkshops?\b|\bopen days?\b|\btasting\b|\bafternoon tea\b/i;

export function tourKind(title: string, tags: readonly string[], genre: Genre | null): TourKind {
  // "The Winery & Distillery Tour and Tasting Experiences" is a tour: the tour is what it sells.
  if (TOUR_WORDS.test(title)) return 'tour';
  if (EXPERIENCE_WORDS.test(title)) return 'experience';

  const t = tags.map((s) => s.toLowerCase());
  if (t.some((s) => s.includes('sessions') || s.includes('classes'))) return 'experience';
  if (t.some((s) => /\btours?\b/.test(s))) return 'tour';

  if (genre === 'On foot' || genre === 'Motorised') return 'tour';
  return 'experience';
}
