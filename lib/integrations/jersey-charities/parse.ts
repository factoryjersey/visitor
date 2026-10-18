import type { EventDate } from '@/lib/db/schema';
import { classifyOccurrence } from '@/lib/domain/occurrence';
import type { VjEvent } from '@/lib/integrations/jersey-com/parse';
import { decodeEntities, htmlToText } from '@/lib/integrations/jersey-com/parse';

/**
 * The Association of Jersey Charities' diary, jerseycharities.org/diary:
 * what member charities are running, quizzes and galas and fairs. No feed
 * and no structured data, so the page is read as written. The diary lists
 * every upcoming event with its date, time and venue; each event's own
 * page adds its description. If the markup changes these come back empty,
 * and the importer says so rather than quietly listing nothing.
 */

export const BASE = 'https://www.jerseycharities.org';

export type DiaryEntry = { id: string; path: string; title: string; venue: string | null; when: string };

const text = (html: string | undefined) => decodeEntities((html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Each `<div class="event">` on the diary page. */
export function parseDiary(html: string): DiaryEntry[] {
  const out: DiaryEntry[] = [];
  for (const block of html.split(/<div class="event">/).slice(1)) {
    const link = /<h3><a href="(\/diary\/(\d+)\/[^"]+)">([\s\S]*?)<\/a><\/h3>/.exec(block);
    if (!link) continue;
    const venue = text(/<h4>([\s\S]*?)<\/h4>/.exec(block)?.[1]);
    out.push({ id: link[2]!, path: link[1]!, title: text(link[3]), venue: venue || null, when: text(/<p class="event-date">([\s\S]*?)<\/p>/.exec(block)?.[1]) });
  }
  return out;
}

/** The pages after this one, from its pager links. */
export function nextPages(html: string): string[] {
  return [...new Set([...html.matchAll(/href="(\/diary\?[^"]*page=\d+[^"]*)"/g)].map((m) => decodeEntities(m[1]!)))];
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * "Fri, 23rd Oct, 2026, 18:30 - 12:00" to the day and times. The diary
 * writes an end of 12:00 when nobody gave one, so an end before the start
 * is dropped. Two dates make a run: "Sat, 7th Nov, 2026 - Sun, 8th Nov, 2026".
 */
export function parseWhen(when: string): EventDate[] {
  const days = [...when.matchAll(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})[a-z]*,?\s+(\d{4})/g)]
    .map((m) => {
      const month = MONTHS.indexOf(m[2]!.toLowerCase());
      return month < 0 ? null : `${m[3]}-${pad(month + 1)}-${pad(Number(m[1]))}`;
    })
    .filter((d): d is string => d !== null);
  if (!days.length) return [];
  const times = [...when.matchAll(/\b(\d{1,2}):(\d{2})\b/g)].map((m) => `${pad(Number(m[1]))}:${m[2]}`);
  const start = times[0] ?? null;
  const end = times[1] && start && times[1] > start ? times[1] : null;
  const first = days[0]!;
  const last = days.at(-1)!;
  const out: EventDate[] = [];
  for (let d = first; d <= last && out.length < 31; d = addDays(d, 1)) out.push({ date: d, start, end });
  return out;
}

/** The event's own page: its clean title, the charity, and what it says about itself. */
export function parseEntryPage(html: string): { title: string | null; charity: string | null; description: string | null } {
  const event = /<div id="event">([\s\S]*?)<a href="\/diary" class="btn/.exec(html)?.[1] ?? '';
  return {
    title: text(/<h2>([\s\S]*?)<\/h2>/.exec(event)?.[1]) || null,
    charity: text(/<a href="\/members\/[^"]+">([\s\S]*?)<\/a>/.exec(event)?.[1]) || null,
    description: htmlToText(/<div id="event-details">([\s\S]*?)<\/div>/.exec(event)?.[1] ?? null),
  };
}

export function toEvent(entry: DiaryEntry, page: ReturnType<typeof parseEntryPage> | null): VjEvent | null {
  const dates = parseWhen(entry.when);
  if (!dates.length || !entry.title) return null;
  // The diary's title is "Charity - Event"; the event's page has them apart.
  const title = page?.title ?? entry.title;
  const charity = page?.charity ?? (entry.title.includes(' - ') ? entry.title.split(' - ')[0]! : null);
  const description = page?.description ?? null;
  const first = description?.split('\n\n')[0] ?? null;
  const summary = [charity && `In aid of ${charity}.`, first && first.length <= 400 ? first : null].filter(Boolean).join(' ') || null;
  const link = `${BASE}${entry.path}`;
  return {
    externalId: entry.id,
    title,
    summary,
    description,
    venue: entry.venue,
    venueName: entry.venue,
    addressLine1: null,
    parish: null,
    postcode: null,
    phone: null,
    email: null,
    website: link,
    eventTypes: [],
    free: false,
    occurrence: classifyOccurrence(dates.map((d) => d.date), { starts: dates.map((d) => d.start) }),
    lat: null,
    lon: null,
    dates,
    startsOn: dates[0]!.date,
    endsOn: dates.at(-1)!.date,
    fromPricePence: null,
    toPricePence: null,
    headerImage: null,
    sourceLink: link,
    modifiedAt: null,
    portalSyncedAt: null,
  };
}
