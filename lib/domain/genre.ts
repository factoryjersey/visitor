/**
 * The genres the guide sorts tours and experiences into, from the
 * autumn 2026 "On demand" pages, plus one for classes, which those
 * pages had to squeeze into "active".
 */
export const GENRES = ['On foot', 'Active', 'On the water', 'Motorised', 'Foodie', 'Classes & crafts'] as const;
export type Genre = (typeof GENRES)[number];

/**
 * A first guess from the listing's own types and title. Providers tag
 * generously ("Active & adrenaline" on a bus tour), so the specific
 * signals win: on the water before anything, a vehicle before walking.
 * Only a suggestion; a person's choice is locked against the next import.
 */
export function suggestGenre(title: string, tags: readonly string[]): Genre | null {
  const t = tags.map((s) => s.toLowerCase());
  const has = (...words: string[]) => t.some((x) => words.some((w) => x.includes(w)));

  // What the title says beats how it was tagged: a seabed walk tagged
  // "water-sports" is still a walk.
  if (/kayak|\bRIB\b|boat|sail|paddle|dive|snorkel|surf|jet ski|seafari|cruise|voyage/i.test(title)) return 'On the water';
  if (/\bbus\b|e-?bike|tractor|train|coach|segway|car tour/i.test(title)) return 'Motorised';
  if (/tasting|foodie|cocktail|afternoon tea|lunch|dinner|sushi|wine|gin\b/i.test(title)) return 'Foodie';
  if (/yoga|pilates|ceramic|pottery|workshop|class\b|masterclass/i.test(title)) return 'Classes & crafts';
  if (/walk|trail|stroll|ramble|hike|ghost|tour of/i.test(title)) return 'On foot';

  if (has('boat', 'water-sports', 'on the water')) return 'On the water';
  if (has('bus')) return 'Motorised';
  if (has('food-drink', 'cookery')) return 'Foodie';
  if (has('yoga', 'pilates', 'arts & crafts')) return 'Classes & crafts';
  if (has('walking', 'self-guided')) return 'On foot';
  if (has('active & adrenaline', 'on land')) return 'Active';
  return null;
}
