/**
 * What kind of thing a list of dates describes. The guide prioritises
 * unique events and tours, the ones on particular dates, over the ones
 * that happen every day or whenever someone books. Providers list both
 * the same way: a kayak tour bookable any day arrives with 149 dates, a
 * tide-dependent walk with four. So the shape of the dates decides.
 *
 *   one-off    one to three dates, or a short consecutive run (a festival)
 *   dates      a handful of particular dates with no weekly rhythm (tide walks)
 *   regular    a weekly rhythm (parkrun, every Tuesday's yoga), or the
 *              same few weekdays week after week (a castle's costumed
 *              guide every Tuesday and Thursday of half-term)
 *   ongoing    most days over a long stretch: open daily, an exhibition,
 *              a daytime programme run every day for more than a week,
 *              or for a tour, bookable on demand
 *
 * The first two are "unique": shown by default, printed in date order.
 */
export const OCCURRENCES = ['one-off', 'dates', 'regular', 'ongoing'] as const;
export type Occurrence = (typeof OCCURRENCES)[number];

export const UNIQUE: readonly Occurrence[] = ['one-off', 'dates'];

const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

/** Before 5pm: a daytime programme, not an evening show. */
const isDaytime = (start: string | null | undefined) => !!start && start < '17:00';

/**
 * Whether the dates keep to a few weekdays and fill nearly every one of
 * them over at least two weeks. Tuesdays and Thursdays of half-term are
 * a rhythm; tide walks, which land on whatever day the tide allows,
 * leave most of their weekdays empty and are not.
 */
function weekdayRhythm(days: number[]): boolean {
  const span = days.at(-1)! - days[0]! + 1;
  if (days.length < 4 || span < 8) return false;
  // Day 0 of the epoch was a Thursday; only the grouping matters here.
  const weekdays = new Set(days.map((d) => d % 7));
  if (weekdays.size > 4) return false;
  let slots = 0;
  for (let d = days[0]!; d <= days.at(-1)!; d += 1) if (weekdays.has(d % 7)) slots += 1;
  return days.length / slots >= 0.75;
}

export function classifyOccurrence(
  isoDates: readonly string[],
  opts: { tour?: boolean; starts?: readonly (string | null)[] } = {},
): Occurrence {
  const days = [...new Set(isoDates)].map(dayNumber).sort((a, b) => a - b);
  if (days.length <= 3) return 'one-off';
  const span = days.at(-1)! - days[0]! + 1;

  // Tour providers list only a week or two ahead, so a bookable-any-day
  // tour looks like a short daily run. For a tour that run means on
  // demand; for a show, a fortnight of nights is still an event.
  if (opts.tour && days.length >= 7 && days.length / span >= 0.6) return 'ongoing';
  if (span === days.length && span <= 7) return 'one-off';

  // Every day for more than a week, and all in the daytime: an
  // attraction's programme (a half-term trail, a costumed guide), not a
  // run of shows. A panto's nights keep it an event.
  if (span === days.length && opts.starts?.length && opts.starts.every(isDaytime)) return 'ongoing';

  // Open, or bookable, most days for three weeks or more. A fortnight's
  // run of a pantomime is an event; a season's opening hours are not.
  if (days.length >= 30 || (span >= 21 && days.length / span >= 0.4)) return 'ongoing';

  // A weekly rhythm: most gaps a whole number of weeks.
  const gaps = days.slice(1).map((d, i) => d - days[i]!);
  const weekly = gaps.filter((g) => g % 7 === 0).length;
  if (days.length >= 4 && weekly / gaps.length >= 0.75) return 'regular';
  // Many days over three weeks is opening, not a rhythm, whatever the weekdays.
  if (days.length >= 15 && span >= 21) return 'ongoing';
  return weekdayRhythm(days) ? 'regular' : 'dates';
}

export const OCCURRENCE_LABEL: Record<Occurrence, string> = {
  'one-off': 'One-off',
  dates: 'Specific dates',
  regular: 'Regular',
  ongoing: 'Ongoing',
};
