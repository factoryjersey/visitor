const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** £135, or £135–£295. All money is held in pence. */
export function rateRange(low: number | null, high: number | null): string | null {
  const f = (p: number) => `£${(p / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  if (low !== null && high !== null && low !== high) return `${f(Math.min(low, high))}–${f(Math.max(low, high))}`;
  const one = low ?? high;
  return one === null ? null : f(one);
}

/**
 * Months open, as a guide prints them: "All year", "Apr–Oct",
 * "Mar–May, Sep–Nov". Wraps around the new year: Nov–Feb.
 */
export function openMonthsText(months: readonly number[]): string | null {
  const set = new Set(months.filter((m) => m >= 1 && m <= 12));
  if (set.size === 0) return null;
  if (set.size === 12) return 'All year';
  const runs: [number, number][] = [];
  // Start a run at a month whose predecessor is closed, so a season
  // crossing December reads as one run.
  for (let m = 1; m <= 12; m += 1) {
    if (!set.has(m) || set.has(((m + 10) % 12) + 1)) continue;
    let end = m;
    while (set.has((end % 12) + 1)) end = (end % 12) + 1;
    runs.push([m, end]);
  }
  runs.sort((a, b) => a[0] - b[0]);
  return runs
    .map(([s, e]) => (s === e ? MONTH_NAMES[s - 1] : `${MONTH_NAMES[s - 1]}–${MONTH_NAMES[e - 1]}`))
    .join(', ');
}

export function address(p: { addressLine1: string | null; addressLine2: string | null; parish: string | null; postcode: string | null }): string {
  return [p.addressLine1, p.addressLine2, p.parish, p.postcode].filter(Boolean).join(', ');
}

/** "2026-12-31" to "31 Dec 2026". */
export function dayText(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH_NAMES[(m ?? 1) - 1]} ${y}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * An event's dates as a guide prints them. Visit Jersey lists a daily
 * exhibition as hundreds of separate dates, so past a handful the
 * dates collapse to a range.
 *
 *   one date        Thu 31 Dec 2026, 19:00
 *   up to four      Sat 17, Sun 18 Oct 2026
 *   more            17 Oct 2026 – 31 Dec 2027 (441 dates)
 */
export function eventDatesText(dates: readonly { date: string; start: string | null }[]): string | null {
  if (dates.length === 0) return null;
  const parse = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
    return { y, m, d, dow: DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]! };
  };
  const first = dates[0]!;
  if (dates.length === 1) {
    const p = parse(first.date);
    return `${p.dow} ${p.d} ${MONTH_NAMES[p.m - 1]} ${p.y}${first.start ? `, ${first.start}` : ''}`;
  }
  if (dates.length <= 4) {
    const ps = dates.map((x) => parse(x.date));
    const last = ps.at(-1)!;
    const sameMonth = ps.every((p) => p.m === last.m && p.y === last.y);
    return ps
      .map((p, i) => {
        const tail = i === ps.length - 1 || !sameMonth ? ` ${MONTH_NAMES[p.m - 1]}` : '';
        return `${p.dow} ${p.d}${tail}`;
      })
      .join(', ') + ` ${last.y}`;
  }
  return `${dayText(first.date)} – ${dayText(dates.at(-1)!.date)} (${dates.length} dates)`;
}

export function priceRange(from: number | null, to: number | null): string | null {
  if (from === null && to === null) return null;
  return rateRange(from, to);
}
