/**
 * What kind of thing a list of dates describes. The guide prioritises
 * unique events and tours, the ones on particular dates, over the ones
 * that happen every day or whenever someone books. Providers list both
 * the same way: a kayak tour bookable any day arrives with 149 dates, a
 * tide-dependent walk with four. So the shape of the dates decides.
 *
 *   one-off    one to three dates, or a short consecutive run (a festival)
 *   dates      on for a while and then gone, on the days it is on: a run of
 *              shows, a month's exhibition, a Christmas market's weekends,
 *              a season of home matches, tide walks
 *   regular    the same session every week for more than six weeks
 *              (parkrun, every Tuesday's yoga, a museum's weekends)
 *   ongoing    open most days for more than six weeks (an attraction's
 *              season, a year-long exhibition), or for a tour, bookable
 *              on demand
 *
 * The first two are "unique": shown by default, printed in date order.
 */
export const OCCURRENCES = ['one-off', 'dates', 'regular', 'ongoing'] as const;
export type Occurrence = (typeof OCCURRENCES)[number];

export const UNIQUE: readonly Occurrence[] = ['one-off', 'dates'];

const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

/**
 * Longer than this, a thing on most days, or every week, is part of the
 * island's furniture rather than something on: six weeks.
 */
const LONG_RUN = 42;

/**
 * Whether the dates keep to a few weekdays and fill nearly every one of
 * them: Saturdays and Sundays all season. Fixtures, which land on
 * whichever Saturday is a home game, leave most of their weekdays empty
 * and are not.
 */
function weekdayRhythm(days: number[]): boolean {
  if (days.length < 4) return false;
  // Day 0 of the epoch was a Thursday; only the grouping matters here.
  const weekdays = new Set(days.map((d) => d % 7));
  if (weekdays.size > 4) return false;
  let slots = 0;
  for (let d = days[0]!; d <= days.at(-1)!; d += 1) if (weekdays.has(d % 7)) slots += 1;
  return days.length / slots >= 0.75;
}

/**
 * What's on should show what is on for a while and then gone, on the
 * days it is on: a festival, a run of shows, a month's exhibition, the
 * four weekends of a Christmas market, a season of home matches. What it
 * keeps back, unless asked, is what is simply always there: open most
 * days for longer than six weeks, or the same session every week for as
 * long. One card either way; this decides only whether it is in the
 * default list.
 */
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
  if (span <= LONG_RUN) return 'dates';

  // Open most days, for longer than six weeks: an attraction's season.
  if (days.length / span >= 0.4) return 'ongoing';

  // Every week for longer than six weeks: parkrun, a weekly class, the
  // museum's weekends. A match every other Saturday is not every week.
  const gaps = days.slice(1).map((d, i) => d - days[i]!);
  const everyWeek = gaps.filter((g) => g <= 7).length;
  if (everyWeek / gaps.length >= 0.75 && weekdayRhythm(days)) return 'regular';
  return 'dates';
}

export const OCCURRENCE_LABEL: Record<Occurrence, string> = {
  'one-off': 'One-off',
  dates: 'Specific dates',
  regular: 'Regular',
  ongoing: 'Ongoing',
};
