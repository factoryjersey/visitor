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

/**
 * An event's dates as the guide prints them, keeping only those inside
 * the edition's window.
 *
 *   one date                          26 OCT
 *   two                               1 SEP & 15 SEP
 *   a short run of consecutive days   1 - 5 SEP, 30 SEP - 4 OCT
 *   a long run, mostly daily          1 SEP UNTIL 29 OCT
 *   anything else                     1 SEP, 3/8/10/15 SEP, 2 OCT
 *
 * The last is the guide's own shape: the first date in full, then the
 * rest grouped by month.
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
  if (consecutive && span <= 7) {
    return first.m === last.m ? `${first.d} - ${last.d} ${MONTHS[last.m - 1]}` : `${dm(first)} - ${dm(last)}`;
  }
  // Open most days over a long stretch: an exhibition, a season.
  if (days.length >= 8 && days.length / span >= 0.4) return `${dm(first)} UNTIL ${dm(last)}`;
  if (days.length === 2) return `${dm(first)} & ${dm(last)}`;

  const groups: string[] = [];
  for (const x of days.slice(1)) {
    const prev = groups.at(-1);
    const label = MONTHS[x.m - 1]!;
    if (prev?.endsWith(` ${label}`)) groups[groups.length - 1] = prev.replace(` ${label}`, `/${x.d} ${label}`);
    else groups.push(`${x.d} ${label}`);
  }
  return [dm(first), ...groups].join(', ');
}

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

/** "https://www.jerseyheritage.org/whats-on/x" to "JERSEYHERITAGE.ORG". */
export function printWebsite(url: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname;
    return host.replace(/^www\./i, '').toUpperCase();
  } catch {
    return null;
  }
}

/** A phone number if there is one, otherwise the email: the guide prints one or the other. */
export function printContact(phone: string | null, email: string | null): string | null {
  return phone?.trim() || email?.trim() || null;
}

/** "Castle Green, St. Martin, JE3 6ET". */
export function printAddress(p: { addressLine1: string | null; parish: string | null; postcode: string | null }): string | null {
  const parts = [p.addressLine1, printParish(p.parish), p.postcode].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
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
