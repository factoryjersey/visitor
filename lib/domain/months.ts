/**
 * What's on a month at a time: /whats-on/2026/november. One page a month,
 * a few dozen in all, that crawlers and people can land on, in place of
 * one page of every event to come.
 */
const NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** "2026-11" to "/whats-on/2026/november". */
export const monthPath = (ym: string) => {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return `/whats-on/${y}/${NAMES[m - 1]}`;
};

/** "2026", "november" to "2026-11"; null for anything else. */
export function monthFromPath(year: string, month: string): string | null {
  const i = NAMES.indexOf(month.toLowerCase());
  if (!/^\d{4}$/.test(year) || i < 0) return null;
  return `${year}-${String(i + 1).padStart(2, '0')}`;
}

/** "2026-11" and n to the month n later: "2027-01" for 2. */
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

/** The first and last day of a month: "2026-11" to 2026-11-01 and 2026-11-30. */
export function monthRange(ym: string): { from: string; to: string } {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, '0')}` };
}

/** "November 2026". */
export const monthTitle = (ym: string) => {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return `${NAMES[m - 1]!.charAt(0).toUpperCase()}${NAMES[m - 1]!.slice(1)} ${y}`;
};
