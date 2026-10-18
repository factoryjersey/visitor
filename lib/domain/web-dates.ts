import type { EventDate } from '@/lib/db/schema';
import type { Occurrence } from './occurrence';

/**
 * When something is on, as the website says it: written for a visitor
 * scanning a list, not set to the guide's house style. Only dates from
 * today on count.
 *
 *   Sat 24 Oct
 *   Sat 31 Oct – Sun 1 Nov
 *   Sat 7 Nov, Mon 23 Nov
 *   Sat 2 Nov, Sun 3 Nov, Sat 9 Nov + 6 more
 *   Every Saturday until 17 Apr
 *   Until 31 Dec 2027
 */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const t = Date.UTC(y, m - 1, d);
  return { y, m, d, t: t / 86_400_000, dow: new Date(t).getUTCDay() };
};

export function upcomingDates(dates: readonly EventDate[], today: string): string[] {
  return [...new Set(dates.map((d) => d.date))].filter((d) => d >= today).sort();
}

export function webWhen(dates: readonly EventDate[], occurrence: Occurrence, today: string): string | null {
  const days = upcomingDates(dates, today).map(parse);
  if (days.length === 0) return null;
  const first = days[0]!;
  const last = days.at(-1)!;
  const thisYear = parse(today).y;
  const dm = (x: typeof first) => `${x.d} ${MONTHS[x.m - 1]}${x.y !== thisYear ? ` ${x.y}` : ''}`;
  const full = (x: typeof first) => `${DAYS[x.dow]} ${dm(x)}`;

  if (occurrence === 'ongoing') {
    const started = dates.some((d) => d.date < today);
    return started || first.t - parse(today).t <= 0 ? `Until ${dm(last)}` : `${dm(first)} – ${dm(last)}`;
  }
  if (occurrence === 'regular') {
    const sameDay = days.every((x) => x.dow === first.dow);
    return sameDay ? `Every ${DAYS_LONG[first.dow]} until ${dm(last)}` : `Regularly until ${dm(last)}`;
  }
  if (days.length === 1) return full(first);
  if (last.t - first.t + 1 === days.length) return `${full(first)} – ${full(last)}`;
  if (days.length <= 3) return days.map(full).join(', ');
  return `${days.slice(0, 3).map(full).join(', ')} + ${days.length - 3} more`;
}

/** The next date on or after today, for ordering a list. */
export function nextDate(dates: readonly EventDate[], today: string): string | null {
  return upcomingDates(dates, today)[0] ?? null;
}
