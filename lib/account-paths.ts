import type { ListingKind } from '@/lib/db/schema';

/** The URL segment for each kind under /account, and back. */
export const KIND_PATH: Record<ListingKind, string> = { venue: 'venues', event: 'events', experience: 'tours' };

export function kindFromPath(segment: string): ListingKind | null {
  const found = (Object.entries(KIND_PATH) as [ListingKind, string][]).find(([, p]) => p === segment);
  return found?.[0] ?? null;
}

export const JERSEY_PARISHES = [
  'Grouville', 'St Brelade', 'St Clement', 'St Helier', 'St John', 'St Lawrence',
  'St Martin', 'St Mary', 'St Ouen', 'St Peter', 'St Saviour', 'Trinity',
] as const;
