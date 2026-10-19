import { Bike, Bus, Castle, Drama, Footprints, Palette, Sailboat, Flower2, Heart, MessagesSquare, Moon, Music, PartyPopper, ShoppingBasket, Snowflake, Trees, Trophy, Users, Utensils, type LucideIcon } from 'lucide-react';
import type { Genre } from '@/lib/domain/genre';

/**
 * A card's kinds at a glance: small icon tiles in the picture's corner,
 * the most telling first and no more than three. Spectator, Participant
 * and Business & networking say nothing to a visitor at a glance, so they
 * have none.
 */
export const MARKERS: [type: string, icon: LucideIcon][] = [
  ['Festivals', PartyPopper],
  ['Music', Music],
  ['Sports', Trophy],
  ['Family friendly', Users],
  ['Charity', Heart],
  ['Food & drink', Utensils],
  ['Arts & cultural', Drama],
  ['History & Heritage', Castle],
  ['Outdoor', Trees],
  ['Nightlife', Moon],
  ['Markets & fairs', ShoppingBasket],
  ['Talks & learning', MessagesSquare],
  ['Health & wellbeing', Flower2],
  ['Seasonal', Snowflake],
];

/** A tour's genre, as one tile. */
const GENRE_MARKERS: Record<Genre, LucideIcon> = {
  'On foot': Footprints,
  Active: Bike,
  'On the water': Sailboat,
  Motorised: Bus,
  Foodie: Utensils,
  'Classes & crafts': Palette,
};

export function markersFor(types: readonly string[], max = 3) {
  return MARKERS.filter(([t]) => types.includes(t)).slice(0, max);
}

export function CategoryMarkers({ types, genre }: { types?: readonly string[] | null; genre?: Genre | null }) {
  const markers: [string, LucideIcon][] = genre ? [[genre, GENRE_MARKERS[genre]]] : markersFor(types ?? []);
  if (!markers.length) return null;
  return (
    <ul className="absolute right-3 top-3 flex gap-1.5" aria-label={genre ? 'Kind of tour' : 'Kind of event'}>
      {markers.map(([type, Icon]) => (
        <li key={type} title={type} className="flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-harbour shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
          <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
          <span className="sr-only">{type}</span>
        </li>
      ))}
    </ul>
  );
}
