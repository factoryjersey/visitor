/**
 * What kind of thing a list of dates describes. The guide prioritises
 * unique events and tours, the ones on particular dates, over the ones
 * that happen every day or whenever someone books. Providers list both
 * the same way: a kayak tour bookable any day arrives with 149 dates, a
 * tide-dependent walk with four. So the shape of the dates decides.
 *
 *   one-off    one to three dates, or a short consecutive run (a festival)
 *   dates      a handful of particular dates with no weekly rhythm (tide walks)
 *   regular    a weekly rhythm (parkrun, every Tuesday's yoga)
 *   ongoing    most days over a long stretch: open daily, an exhibition,
 *              or for a tour, bookable on demand
 *
 * The first two are "unique": shown by default, printed in date order.
 */
export const OCCURRENCES = ['one-off', 'dates', 'regular', 'ongoing'] as const;
export type Occurrence = (typeof OCCURRENCES)[number];

export const UNIQUE: readonly Occurrence[] = ['one-off', 'dates'];

const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

export function classifyOccurrence(isoDates: readonly string[], opts: { tour?: boolean } = {}): Occurrence {
  const days = [...new Set(isoDates)].map(dayNumber).sort((a, b) => a - b);
  if (days.length <= 3) return 'one-off';
  const span = days.at(-1)! - days[0]! + 1;

  // Tour providers list only a week or two ahead, so a bookable-any-day
  // tour looks like a short daily run. For a tour that run means on
  // demand; for a show, a fortnight of nights is still an event.
  if (opts.tour && days.length >= 7 && days.length / span >= 0.6) return 'ongoing';
  if (span === days.length && span <= 7) return 'one-off';

  // Open, or bookable, most days for three weeks or more. A fortnight's
  // run of a pantomime is an event; a season's opening hours are not.
  if (days.length >= 30 || (span >= 21 && days.length / span >= 0.4)) return 'ongoing';

  // A weekly rhythm: most gaps a whole number of weeks.
  const gaps = days.slice(1).map((d, i) => d - days[i]!);
  const weekly = gaps.filter((g) => g % 7 === 0).length;
  if (days.length >= 4 && weekly / gaps.length >= 0.75) return 'regular';

  return days.length >= 15 && span >= 21 ? 'ongoing' : 'dates';
}

export const OCCURRENCE_LABEL: Record<Occurrence, string> = {
  'one-off': 'One-off',
  dates: 'Specific dates',
  regular: 'Regular',
  ongoing: 'Ongoing',
};
