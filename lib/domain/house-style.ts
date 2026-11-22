import type { EventDate } from '@/lib/db/schema';

/**
 * How the visitor guide prints things. Every rule here is copied from a
 * printed edition (vjvg_26_3, What's On), not invented:
 *
 *   1 SEP UNTIL 29 OCT   10:00-16:00
 *   Meet Albert: The Retired Gunner
 *   Step into the past and meet Albert…  £11.45 - £24.50
 *   Elizabeth Castle
 *   St Aubin's Bay, St. Helier
 *   +44 (0) 1534 633300
 *   JERSEYHERITAGE.ORG
 *
 * Pure, so the page preview and the InDesign export print the same thing.
 */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** The guide writes "St. Helier", with a full stop. */
export function printParish(parish: string | null): string | null {
  if (!parish) return null;
  return parish.replace(/^(St|Saint)\.?\s+/i, 'St. ');
}

type Day = { iso: string; y: number; m: number; d: number; t: number };

function day(iso: string): Day {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return { iso, y, m, d, t: Date.UTC(y, m - 1, d) / 86_400_000 };
}

const dm = (x: Day) => `${x.d} ${MONTHS[x.m - 1]}`;

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const short = (w: number) => WEEKDAYS[w]!.slice(0, 3);

/**
 * The same one to four weekdays, filled most weeks for a fortnight or
 * more: "FRIDAY", "SAT & SUN", "THU - SUN". Null for anything else, a
 * daily run or dates that skip about.
 */
function everyWeek(days: Day[]): string | null {
  const first = days[0]!;
  const last = days.at(-1)!;
  if (days.length < 4 || last.t - first.t < 13) return null;
  const dow = (x: Day) => new Date(x.t * 86_400_000).getUTCDay();
  const weekdays = [...new Set(days.map(dow))].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (weekdays.length > 4) return null;
  let slots = 0;
  for (let t = first.t; t <= last.t; t += 1) if (weekdays.includes(new Date(t * 86_400_000).getUTCDay())) slots += 1;
  if (days.length / slots < 0.75) return null;
  if (weekdays.length === 1) return WEEKDAYS[weekdays[0]!]!;
  const mon = weekdays.map((w) => (w + 6) % 7);
  const run = mon.every((w, i) => i === 0 || w === mon[i - 1]! + 1);
  if (run && weekdays.length > 2) return `${short(weekdays[0]!)} - ${short(weekdays.at(-1)!)}`;
  return weekdays.length === 2 ? `${short(weekdays[0]!)} & ${short(weekdays[1]!)}` : weekdays.map(short).join(', ');
}

/** Past about six months after the edition, an ongoing listing's last date is the source's "no end", not a closing date. */
const OPEN_ENDED_AFTER = 180;

/**
 * When an ongoing listing is on, for the Ongoing events page: by its own
 * first and last days, not clipped to the edition, and with no end at all
 * when the source's end is a placeholder far off. "UNTIL 10 JAN",
 * "FROM 1 JAN", "12 DEC - 4 APR", or "ALL SEASON" when it is on before the
 * edition starts and after it ends. Null when not on in the edition.
 */
export function printOngoingDates(dates: readonly EventDate[], window: { from: string; to: string }): string | null {
  const isos = [...new Set(dates.map((x) => x.date))].sort();
  if (!isos.some((iso) => iso >= window.from && iso <= window.to)) return null;
  const first = day(isos[0]!);
  const last = day(isos.at(-1)!);
  const end = day(window.to);
  const starts = first.iso > window.from;
  const ends = last.t - end.t <= OPEN_ENDED_AFTER;
  if (starts && ends) return `${dm(first)} - ${dm(last)}`;
  if (starts) return `FROM ${dm(first)}`;
  if (ends) return `UNTIL ${dm(last)}`;
  return 'ALL SEASON';
}

/**
 * An event's dates as the guide prints them, keeping only those inside
 * the edition's window. The editor's style (Elliott, winter 2026 proofs):
 * the days of a month listed with commas before it, a run with a hyphen.
 *
 *   one date                          26 OCT
 *   two days running                  19, 20 DEC
 *   a run of consecutive days         8-13 DEC, 30 SEP - 4 OCT
 *   the same days most weeks          EVERY FRIDAY, 6 NOV - 18 DEC
 *                                     EVERY THU - SUN, 26 NOV - 20 DEC
 *   a long run, mostly daily          1-31 DEC, 18 DEC - 3 JAN
 *   anything else, by month           5, 6, 20 DEC; 4, 11, 18 DEC, 2 JAN
 */
export function printDates(dates: readonly EventDate[], window?: { from: string; to: string }): string | null {
  const isos = [...new Set(dates.map((x) => x.date))]
    .filter((iso) => !window || (iso >= window.from && iso <= window.to))
    .sort();
  if (isos.length === 0) return null;
  const days = isos.map(day);
  const first = days[0]!;
  const last = days.at(-1)!;
  if (days.length === 1) return dm(first);

  const span = last.t - first.t + 1;
  const consecutive = span === days.length;
  const run = () => (first.m === last.m && first.y === last.y ? `${first.d}-${last.d} ${MONTHS[last.m - 1]}` : `${dm(first)} - ${dm(last)}`);
  if (consecutive && span <= 7 && days.length > 2) return run();
  const weekly = everyWeek(days);
  if (weekly) return `EVERY ${weekly}, ${dm(first)} - ${dm(last)}`;
  // Open most days over a long stretch: an exhibition, a season.
  if (days.length >= 8 && days.length / span >= 0.4) return run();
  return byMonth(days);
}

/** "5, 6, 20 DEC", "4, 11, 18 DEC, 2 JAN": each month's days, then the month. */
function byMonth(days: Day[]): string {
  const groups: { key: string; label: string; days: number[] }[] = [];
  for (const x of days) {
    const key = `${x.y}-${x.m}`;
    const g = groups.at(-1);
    if (g?.key === key) g.days.push(x.d);
    else groups.push({ key, label: MONTHS[x.m - 1]!, days: [x.d] });
  }
  return groups.map((g) => `${g.days.join(', ')} ${g.label}`).join(', ');
}

/** Times that differ from day to day, beyond two, confuse more than they tell (the editor struck them): the guide leaves them to the organiser. */
export const tooManyTimes = (times: string) => times.split(/ \| |, /).length > 2;

/**
 * "10:00-16:00", or "15:00, 19:30" for two shows with no end time, or
 * "18:30-23:00 | 9:30-23:00" when the hours differ between days.
 */
export function printTimes(dates: readonly EventDate[]): string | null {
  const seen: string[] = [];
  for (const x of dates) {
    if (!x.start) continue;
    const t = x.end ? `${x.start}-${x.end}` : x.start;
    if (!seen.includes(t)) seen.push(t);
  }
  if (seen.length === 0) return null;
  return seen.some((t) => t.includes('-')) ? seen.join(' | ') : seen.join(', ');
}

/** "£11.45 - £24.50", "£5.00", or "Free entry" when the source says nothing costs anything. */
export function printPrice(from: number | null, to: number | null, opts: { free?: boolean } = {}): string | null {
  const f = (p: number) => `£${(p / 100).toFixed(2)}`;
  if (from !== null && to !== null && from !== to) return `${f(Math.min(from, to))} - ${f(Math.max(from, to))}`;
  const one = from ?? to;
  if (one !== null) return f(one);
  return opts.free ? 'Free entry' : null;
}

const hostOf = (url: string): string | null => {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
};

const SOCIAL: [RegExp, string][] = [
  [/(^|\.)(facebook|fb)\.(com|me)$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(twitter|x)\.com$/, 'X'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)linktr\.ee$/, 'Linktree'],
];

/** "Facebook" for a Facebook page, and so on: a social page is not a website. */
export function socialSite(url: string | null): string | null {
  const host = url ? hostOf(url) : null;
  return host ? SOCIAL.find(([re]) => re.test(host))?.[1] ?? null : null;
}

/** "https://www.jerseyheritage.org/whats-on/x" to "JERSEYHERITAGE.ORG". A social page prints as nothing: the guide prints websites only. */
export function printWebsite(url: string | null): string | null {
  if (!url || socialSite(url)) return null;
  return hostOf(url)?.toUpperCase() ?? null;
}

/** A provider's website in the guide's key: its address, a social page's too ("facebook.com"), since the key has nothing else to point to. */
export function keyWebsite(url: string | null): string {
  return (url && hostOf(url)) || '';
}

/** How a link reads on the site: the website's address, or the social page's name. */
export function siteLabel(url: string | null): string | null {
  return socialSite(url) ?? printWebsite(url)?.toLowerCase() ?? null;
}

/** A phone number if there is one, otherwise the email: the guide prints one or the other. */
export function printContact(phone: string | null, email: string | null): string | null {
  return printPhone(phone) || email?.trim() || null;
}

/** A phone number with the trunk 0 once: "+44 (0) 01534 720511" is "+44 (0) 1534 720511". */
export function printPhone(phone: string | null): string | null {
  const p = phone?.trim();
  return p ? p.replace(/^(\+44\s*\(0\)\s*)0/, '$1') : null;
}

/**
 * "Castle Green, St. Martin, JE3 6ET". A source's first line often holds
 * the whole address already ("Church Street, St. Helier, JE2 3NN Jersey"),
 * so each part prints once: the parish and postcode are not repeated, the
 * island's name is left off, and a stray half postcode ("-JE2") goes.
 */
export function printAddress(p: { addressLine1: string | null; parish: string | null; postcode: string | null }): string | null {
  const POSTCODE = /\bJE\d\s*\d[A-Z]{2}\b/i;
  const same = (a: string) => a.toLowerCase().replace(/^(st|saint)\.?\s+/, 'st ').replace(/[^a-z0-9]+/g, '');
  const parish = printParish(p.parish);
  const postcode = p.postcode?.trim().toUpperCase() || null;
  const lineParts = (p.addressLine1 ?? '')
    .split(',')
    .map((x) => x.replace(/\bJersey\b/gi, '').replace(/^[\s\-–]+|[\s\-–]+$/g, '').replace(/\s+/g, ' ').trim())
    .flatMap((x) => {
      // A postcode run into another part ("JE2 4WQ St. Helier"): apart, so each can be checked.
      const m = POSTCODE.exec(x);
      return m ? [x.replace(m[0], '').trim(), m[0].toUpperCase()].filter(Boolean) : [x];
    })
    .filter((x) => x && !/^JE\d?$/i.test(x));
  const code = postcode ?? lineParts.find((x) => POSTCODE.test(x)) ?? null;
  const parts: string[] = [];
  for (const x of lineParts) {
    if (POSTCODE.test(x)) continue;
    const parishHere = printParish(x);
    if (parish && same(parishHere ?? x) === same(parish)) continue;
    if (parts.some((y) => same(y) === same(x))) continue;
    parts.push(x);
  }
  const all = [...parts, ...(parish ? [parish] : []), ...(code ? [code] : [])];
  return all.length ? all.join(', ') : null;
}

const TOUR_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Tours print their dates differently from events, every date grouped by
 * month: "1/8/15/22/29 Sep, 6 Oct", "2/13/16/27/28 Sep, 7/27 Oct".
 */
export function printTourDates(dates: readonly EventDate[], window?: { from: string; to: string }): string | null {
  const isos = [...new Set(dates.map((x) => x.date))]
    .filter((iso) => !window || (iso >= window.from && iso <= window.to))
    .sort();
  if (isos.length === 0) return null;
  const groups: { key: string; label: string; days: number[] }[] = [];
  for (const iso of isos) {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
    const key = `${y}-${m}`;
    const g = groups.at(-1);
    if (g?.key === key) g.days.push(d);
    else groups.push({ key, label: TOUR_MONTHS[m - 1]!, days: [d] });
  }
  return groups.map((g) => `${g.days.join('/')} ${g.label}`).join(', ');
}

/** Words a title keeps small unless they open or close it, or follow a colon or dash. */
// Not la, le and les: in Jersey they begin place names (La Hougue Bie, Le Hocq, Les Landes) and print with a capital.
const MINOR = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'en', 'for', 'from', 'in', 'into', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'v', 'vs', 'via', 'with', 'de', 'du', 'des']);

/**
 * A heading in title case, as the guide prints them: "An Island Christmas
 * Carol at 16 New Street", "Jersey Bulls v Hartley Wintney". What its
 * source already wrote with care is kept: acronyms (JCG, RFC), names with
 * capitals inside (O'Sullivan, McQueen, iNED). A title shouted in
 * capitals is cased again from scratch.
 */
/** Words that describe a venue rather than name it: a tail of two or more of them comes off its name in a listing box. */
const VENUE_WORDS = new Set(['restaurant', 'restaurants', 'bar', 'bars', 'wine', 'tapas', 'coffee', 'shop', 'grub', 'bistro', 'brasserie', 'tearoom', 'café', 'cafe', 'kitchen', 'dining', 'pub', 'grill', 'eatery', 'terrace', 'seafood', 'and', '&']);
const NOT_A_NAME = new Set(['the', 'a', 'an', 'la', 'le', 'les']);

/**
 * A venue's name as a listing box prints it, shorter, with any "at …" for the first line of its words:
 *   "Locke’s Coffee & Grub" → Locke’s; "Pêtchi Restaurant & Wine Bar" → Pêtchi;
 *   "Dockyard Restaurant – Marina Metro Hotel" → Dockyard Restaurant; "The Harbour Gallery Jersey" → The Harbour Gallery;
 *   "The Terrace at the Ommaroo Hotel" → The Terrace, "at the Ommaroo Hotel".
 * A name that is all descriptive words, or a single one after the name ("Prince’s Bar", "So Bar"), stays whole.
 */
export function printVenueName(given: string): { name: string; sub: string } {
  let name = given.replace(/\s+/g, ' ').trim();
  let sub = '';
  // What follows a dash is a description, or the hotel it is in: it goes.
  name = name.replace(/\s+[–—-]\s+.*$/, '');
  // "at …": the place it is in, to the first line of its words.
  const at = name.match(/^(.+?)\s+(at\s+.+)$/i);
  if (at && !NOT_A_NAME.has(at[1]!.toLowerCase())) [name, sub] = [at[1]!, at[2]!.replace(/^At\b/, 'at')];
  // A comma before the hotel's name ("Champagne Lounge, Grand Jersey"), not before a list ("Steam, Motor & General Museum").
  const comma = name.match(/^(.+?),\s+([^,&]+)$/);
  if (comma && !/\band\b/i.test(comma[2]!) && !comma[2]!.split(' ').every((w) => VENUE_WORDS.has(w.toLowerCase()))) [name, sub] = [comma[1]!, sub || `at ${comma[2]!}`];
  // A tail of descriptive words, two or more ("Coffee & Grub", "Café, Bar & Bistro").
  const words = name.split(' ');
  let cut = words.length;
  while (cut > 1 && VENUE_WORDS.has(words[cut - 1]!.replace(/,$/, '').toLowerCase())) cut -= 1;
  const head = words.slice(0, cut);
  if (words.length - cut >= 2 && head.some((w) => !NOT_A_NAME.has(w.toLowerCase()))) name = head.join(' ').replace(/,$/, '');
  // "Jersey" after a name of two words or more, not "Maison de Jersey".
  const w = name.split(' ');
  if (w.length >= 3 && w.at(-1) === 'Jersey' && !/^(de|of|du)$/i.test(w.at(-2)!)) name = w.slice(0, -1).join(' ');
  return { name, sub };
}

export function printTitle(given: string): string {
  // A booking site's own tidying left in: a date ("Folklore Walk 3   4/12/26"), and runs of spaces.
  const title = given.replace(/\s+\d{0,2}\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/, '').replace(/\s+/g, ' ').trim();
  const letters = title.replace(/[^A-Za-z]/g, '');
  const shouted = letters.length > 3 && letters === letters.toUpperCase();
  const source = shouted ? title.toLowerCase() : title;
  const words = source.split(/(\s+)/);
  const real = words.map((w, i) => (/\S/.test(w) ? i : -1)).filter((i) => i >= 0);
  const first = real[0];
  const last = real.at(-1);
  return words
    .map((w, i) => {
      if (!/\S/.test(w)) return w;
      const before = words.slice(0, i).join('').trimEnd();
      const opens = i === first || i === last || /[:–—\-(]$/.test(before);
      return w
        .split('-')
        .map((part, j) => {
          const core = part.replace(/^[^A-Za-z0-9]+/, '');
          const lead = part.slice(0, part.length - core.length);
          if (!core) return part;
          // Already deliberate: an acronym or a capital inside the word.
          if (!shouted && (/^[A-Z0-9&.]{2,}$/.test(core.replace(/[^A-Za-z0-9&.]/g, '')) || /[a-z][A-Z]/.test(core) || /^[a-z]+[A-Z]/.test(core))) return part;
          const bare = core.toLowerCase().replace(/[^a-z]/g, '');
          if (j === 0 && !opens && MINOR.has(bare)) return lead + core.toLowerCase();
          if (/^\d/.test(core)) return part;
          return lead + core.charAt(0).toUpperCase() + core.slice(1);
        })
        .join('-');
    })
    .join('')
    // "St Lawrence" as the guide writes it: "St. Lawrence".
    .replace(/\bSt(?= [A-Z])/g, 'St.');
}

/** Where, for a card: the venue or meeting point, and the parish unless the name already says it. "Jersey Arts Centre, St. Helier". */
export function cardLocation(place: string | null | undefined, parish: string | null | undefined): string | null {
  const name = place?.trim() || null;
  const p = printParish(parish ?? null);
  const letters = (s: string) => s.toLowerCase().replace(/^(st\.?|saint)\s+/, '').replace(/[^a-z]/g, '');
  if (!name || !p) return name ?? p;
  return letters(name).includes(letters(p)) ? name : `${name}, ${p}`;
}
