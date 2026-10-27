/**
 * A venue is new for six months from when it was first listed: first
 * published on jersey.com, or added by us. Long enough to see it into two
 * editions of the printed guide; short enough that the label means it.
 */
export const NEW_MONTHS = 6;

export function newSince(now = new Date()): Date {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - NEW_MONTHS);
  return d;
}

export const isNewVenue = (firstListedAt: Date | string | null | undefined, now = new Date()) =>
  !!firstListedAt && new Date(firstListedAt) >= newSince(now) && new Date(firstListedAt) <= now;

const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'Europe/Jersey' });
/** "Added October 2026". */
export const addedLine = (firstListedAt: Date | string) => `Added ${MONTH.format(new Date(firstListedAt))}`;
