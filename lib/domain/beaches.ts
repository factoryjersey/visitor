/**
 * The Beaches section's opening page: the 2026 edition's Beach Guide
 * introduction, its notes on the tides and safe swimming, and the
 * beach wheelchairs BeachAbility lends. The beaches themselves are
 * venues, in the guide's Beaches section, each under its coast.
 */
export const BEACH_INTRO =
  'No matter how you spend your time on Jersey, you’ll no doubt want to feel either the sand between your toes or breathe in the fresh sea air as you explore our beaches and coves. They each have their own unique personality. Choose the one that’s right for you…';

export const BEACH_NOTES: { title: string; text: string }[] = [
  {
    title: 'Tides',
    text: 'Jersey’s tidal range is one of the largest in the world, at around 12 metres, and the sea comes back quickly: it’s easy to get caught out. Stray too far from the shore and the tide can cut you off. Check the tide times, pay close attention to the signs and know the dangers.',
  },
  {
    title: 'Safe swimming',
    text: 'The RNLI’s lifeguards watch over the popular bays in the season: swim between the red and yellow flags. rnlijersey.org.je',
  },
  {
    title: 'BeachAbility',
    text: 'Beach wheelchairs that glide over sand and stone, lent free to anyone with a permanent or temporary mobility difficulty, at West Park, Bel Royal Kiosk and the Gunsite Café on St. Aubin’s Bay, Le Braye Café in St. Ouen’s Bay, St. Brelade’s Bay, Long Beach in Gorey and La Mare Slip in St. Clement. +44 (0) 7797 935088, beachability.org',
  },
];

/** What a beach box's marks mean, under the introduction. */
export const BEACH_KEY = 'Beaches by coast. The letters beside each name say which way it faces; the bus routes that stop nearby are under its copy.';


/** The coasts in the order the guide reads the island, as its areas are ordered. */
export const COAST_ORDER = ['East', 'North', 'West', 'South'] as const;

const POINTS: Record<string, string> = { N: 'north', S: 'south', E: 'east', W: 'west' };

/** "SW" as "Faces south-west": the printed letters in words, for the site. */
export function facingWords(code: string): string {
  const c = code.trim().toUpperCase();
  if (!/^[NSEW]{1,3}$/.test(c)) return code;
  return `Faces ${[...c].map((l) => POINTS[l]).join('-')}`;
}
