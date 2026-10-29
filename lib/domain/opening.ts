import { openMonthsText } from './format';

/**
 * When a place opens: its hours through the week, as Visit Jersey lists
 * them, and the months it opens. The guide prints them together
 * ("Apr–Oct · Tue–Sun 10:00–17:00"), and a winter edition looks ahead to
 * when the attractions closed for the season open again.
 */
export const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Day = (typeof WEEK)[number];
/** Opening and closing time, "10:00" and "17:00", for each day it opens. */
export type WeekHours = Partial<Record<Day, [string, string]>>;

const DAY_NAME: Record<Day, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const MONTH_NAME = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const time = (v: unknown): string | null => {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(String(v ?? '').trim());
  return m ? `${m[1]!.padStart(2, '0')}:${m[2]}` : null;
};

/** Visit Jersey's opening_hours ({ monday: { opens, closes, is_open } … }), unless the listing hides them. */
export function weekHours(v: unknown, hidden?: unknown): WeekHours | null {
  if (!v || typeof v !== 'object' || hidden === true || hidden === 'true' || hidden === '1') return null;
  const out: WeekHours = {};
  for (const [key, day] of Object.entries(v as Record<string, unknown>)) {
    const d = WEEK.find((w) => key.toLowerCase().startsWith(w));
    if (!d || !day || typeof day !== 'object') continue;
    const { opens, closes, is_open: isOpen } = day as Record<string, unknown>;
    const o = time(opens);
    const c = time(closes);
    if (String(isOpen) === '1' && o && c) out[d] = [o, c];
  }
  return Object.keys(out).length ? out : null;
}

/** "Daily 10:00–17:00", "Tue–Sun 10:00–17:00", "Mon–Sat 07:30–16:00, Sun 10:00–15:00". */
export function hoursText(h: WeekHours | null | undefined): string | null {
  if (!h) return null;
  const at = WEEK.map((d) => (h[d] ? `${h[d]![0]}–${h[d]![1]}` : null));
  if (at.every((t) => t && t === at[0])) return `Daily ${at[0]}`;
  const runs: { from: number; to: number; t: string }[] = [];
  at.forEach((t, i) => {
    if (!t) return;
    const last = runs.at(-1);
    if (last && last.to === i - 1 && last.t === t) last.to = i;
    else runs.push({ from: i, to: i, t });
  });
  if (!runs.length) return null;
  const days = (r: { from: number; to: number }) => (r.from === r.to ? DAY_NAME[WEEK[r.from]!] : `${DAY_NAME[WEEK[r.from]!]}–${DAY_NAME[WEEK[r.to]!]}`);
  // Days that share hours but are not next to each other read as one list: "Mon, Wed–Sun 10:00–17:00".
  const byTime = new Map<string, string[]>();
  for (const r of runs) byTime.set(r.t, [...(byTime.get(r.t) ?? []), days(r)]);
  return [...byTime].map(([t, ds]) => `${ds.join(', ')} ${t}`).join(', ');
}

/** The months it opens, when not all year, then its hours: what a listing prints. */
export function openingText(h: WeekHours | null | undefined, months: readonly number[]): string | null {
  const season = months.length && months.length < 12 ? openMonthsText(months) : null;
  return [season, hoursText(h)].filter(Boolean).join(' · ') || null;
}

/** The months from one date to another, inclusive: 2026-11-01 to 2027-02-28 is Nov, Dec, Jan, Feb. */
export function windowMonths(from: string, to: string): number[] {
  const out: number[] = [];
  let [y, m] = from.split('-').map(Number) as [number, number];
  const [ty, tm] = to.split('-').map(Number) as [number, number];
  while ((y < ty || (y === ty && m <= tm)) && out.length < 12) {
    out.push(m);
    if (++m > 12) [y, m] = [y + 1, 1];
  }
  return out;
}

/**
 * When a place closed for part of an edition opens again: the first
 * month it opens after the first month of the edition it is closed.
 * Null when it opens throughout, or when the source does not say.
 */
export function reopensIn(months: readonly number[], edition: readonly number[]): number | null {
  if (!months.length || months.length === 12) return null;
  const closed = edition.find((m) => !months.includes(m));
  if (closed === undefined) return null;
  for (let i = 1; i <= 12; i += 1) {
    const m = ((closed - 1 + i) % 12) + 1;
    if (months.includes(m)) return m;
  }
  return null;
}

export const monthName = (m: number) => MONTH_NAME[m - 1] ?? '';
