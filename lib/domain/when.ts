/**
 * When, for What's on and Tours: the quick picks visitors reach for first
 * (today, tomorrow, this weekend, the next week or month) and any two dates
 * from a calendar. Each comes to a from and a to, both days inclusive, as
 * YYYY-MM-DD in Jersey, so a link says what it shows. Pure, so a weekend
 * that starts on the wrong day becomes a test.
 */

export const WHEN_PICKS = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'weekend', label: 'This weekend' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'month', label: 'Next 30 days' },
] as const;
export type WhenPick = (typeof WHEN_PICKS)[number]['value'];

export type WhenParams = { when?: string; from?: string; to?: string; month?: string };
export type Range = { from: string; to: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (from: string, n: number) => iso(new Date(day(from).getTime() + n * 86_400_000));

/** Today's date in Jersey, which is the day a visitor means by "today", whatever the server's clock. */
export function jerseyToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Jersey', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** The days a quick pick covers. A weekend is Saturday and Sunday: this one while it lasts, otherwise the next. */
export function pickRange(pick: WhenPick, today: string): Range {
  switch (pick) {
    case 'today':
      return { from: today, to: today };
    case 'tomorrow':
      return { from: addDays(today, 1), to: addDays(today, 1) };
    case 'weekend': {
      const dow = day(today).getUTCDay(); // 0 Sunday … 6 Saturday
      if (dow === 0) return { from: today, to: today };
      const saturday = addDays(today, 6 - dow);
      return { from: saturday, to: addDays(saturday, 1) };
    }
    case 'week':
      return { from: today, to: addDays(today, 6) };
    case 'month':
      return { from: today, to: addDays(today, 29) };
  }
}

/**
 * The range a page's parameters ask for, or null for any time. A quick
 * pick wins; then dates from the calendar, either end left open, the two
 * put in order and nothing before today; then an old `month=` link.
 */
export function resolveWhen(p: WhenParams, today: string): (Range & { pick: WhenPick | 'dates' }) | null {
  const pick = WHEN_PICKS.find((w) => w.value === p.when)?.value;
  if (pick) return { ...pickRange(pick, today), pick };

  let from = p.from && ISO.test(p.from) ? p.from : undefined;
  let to = p.to && ISO.test(p.to) ? p.to : undefined;
  if (!from && !to && p.month && /^\d{4}-\d{2}$/.test(p.month)) {
    const [y, m] = p.month.split('-').map(Number) as [number, number];
    from = `${p.month}-01`;
    to = iso(new Date(Date.UTC(y, m, 0)));
  }
  if (!from && !to) return null;
  if (from && to && from > to) [from, to] = [to, from];
  from = !from || from < today ? today : from;
  to = to ?? '9999-12-31';
  if (to < from) return null;
  return { from, to, pick: 'dates' };
}

/** How the chosen range reads on the Filters button and the page: "Sat 24 – Sun 25 Oct". */
export function rangeLabel(r: Range): string {
  const f = day(r.from);
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-GB', { timeZone: 'UTC', ...o });
  if (r.to === '9999-12-31') return `From ${fmt(f, { weekday: 'short', day: 'numeric', month: 'short' })}`;
  const t = day(r.to);
  if (r.from === r.to) return fmt(f, { weekday: 'short', day: 'numeric', month: 'short' });
  const sameMonth = f.getUTCMonth() === t.getUTCMonth() && f.getUTCFullYear() === t.getUTCFullYear();
  return `${fmt(f, sameMonth ? { weekday: 'short', day: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' })} – ${fmt(t, { weekday: 'short', day: 'numeric', month: 'short' })}`;
}
