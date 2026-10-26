import { classifyOccurrence } from './occurrence';

/**
 * Ticket sites sell each performance on its own: a matinee and an
 * evening, or a run of nights each named for its date ("Legally Blonde
 * Tuesday 1st December", "Legally Blonde Wednesday 2nd December"). The
 * guide lists the show once, with every date: same venue, same show
 * once the words that tell one performance from another are taken out.
 * The first performance's record carries the show.
 */

type Run = {
  externalId: string;
  title: string;
  venueName: string | null;
  dates: { date: string; start: string | null; end: string | null }[];
  startsOn: string | null;
  endsOn: string | null;
  occurrence: ReturnType<typeof classifyOccurrence>;
  fromPricePence: number | null;
  toPricePence: number | null;
};

const WEEKDAYS = '(?:mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?|sun)(?:day)?';
const MONTHS = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DAY = '\\d{1,2}(?:st|nd|rd|th)?';
/** "Tuesday 1st December", "Sat 7 Nov", "1 December 2026", "12/12", "matinee", "evening performance". */
const PERFORMANCE = new RegExp(
  [
    `\\b${WEEKDAYS}(?:\\s+${DAY})?(?:\\s+(?:of\\s+)?${MONTHS})?(?:\\s+\\d{4})?\\b`,
    `\\b${DAY}\\s+(?:of\\s+)?${MONTHS}(?:\\s+\\d{4})?\\b`,
    `\\b${MONTHS}\\s+${DAY}(?:,?\\s+\\d{4})?\\b`,
    '\\b\\d{1,2}[/.]\\d{1,2}(?:[/.]\\d{2,4})?\\b',
    '\\b(?:matinee|evening|afternoon|morning)(?:\\s+performance)?\\b',
    '\\b(?:relaxed|early|late)\\s+(?:performance|show)\\b',
  ].join('|'),
  'gi',
);

/** The show, without the words that tell one performance from another. */
export const showName = (title: string) => title.toLowerCase().replace(PERFORMANCE, ' ').replace(/\b(fundraiser|performance|show)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/** The title as the guide prints the whole run: "Legally Blonde", not "Legally Blonde Tuesday 1st December". */
export function runTitle(title: string): string {
  const out = title
    .replace(PERFORMANCE, ' ')
    .replace(/\s*[–—-]\s*(?=[–—-]|$)/g, ' ')
    .replace(/^\s*[–—:,-]\s*|\s*[–—:,(-]\s*$/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return out.length >= 3 ? out : title;
}

export function joinRuns<T extends Run>(events: T[]): { events: T[]; joined: Map<string, string> } {
  const byShow = new Map<string, T>();
  /** Each performance folded into another: its id to the id that carries the show. */
  const joined = new Map<string, string>();
  for (const e of events) {
    const name = showName(e.title);
    const venue = (e.venueName ?? '').toLowerCase().trim();
    const key = `${venue}|${name}`;
    const seen = byShow.get(key);
    // Without a venue, or without a name left, there is nothing to say two listings are one show.
    if (!seen || !venue || !name) {
      byShow.set(seen ? `${key}|${e.externalId}` : key, e);
      continue;
    }
    const dates = [...seen.dates, ...e.dates]
      .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
      .filter((d, i, all) => i === 0 || d.date !== all[i - 1]!.date || d.start !== all[i - 1]!.start);
    joined.set(e.externalId, seen.externalId);
    byShow.set(key, {
      ...seen,
      title: runTitle(seen.title.length <= e.title.length ? seen.title : e.title),
      dates,
      startsOn: dates[0]!.date,
      endsOn: dates.at(-1)!.date,
      occurrence: classifyOccurrence(dates.map((d) => d.date), { starts: dates.map((d) => d.start) }),
      fromPricePence: [seen.fromPricePence, e.fromPricePence].filter((p): p is number => p !== null).sort((a, b) => a - b)[0] ?? null,
      toPricePence: Math.max(seen.toPricePence ?? 0, e.toPricePence ?? 0, seen.fromPricePence ?? 0, e.fromPricePence ?? 0) || null,
    });
  }
  return { events: [...byShow.values()], joined };
}
