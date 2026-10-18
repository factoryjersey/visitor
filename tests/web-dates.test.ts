import { describe, expect, it } from 'vitest';
import { cardWhen, nextDate, webWhen } from '@/lib/domain/web-dates';

const d = (...isos: string[]) => isos.map((date) => ({ date, start: null, end: null }));
const today = '2026-10-18';

describe('webWhen', () => {
  it('writes one date, a run and a few dates', () => {
    expect(webWhen(d('2026-10-24'), 'one-off', today)).toBe('Sat 24 Oct');
    expect(webWhen(d('2026-10-31', '2026-11-01'), 'one-off', today)).toBe('Sat 31 Oct – Sun 1 Nov');
    expect(webWhen(d('2026-11-07', '2026-11-23'), 'one-off', today)).toBe('Sat 7 Nov, Mon 23 Nov');
    expect(webWhen(d('2026-11-01', '2026-11-03', '2026-11-09', '2026-11-12', '2026-11-20'), 'dates', today)).toBe('Sun 1 Nov, Tue 3 Nov, Mon 9 Nov + 2 more');
  });

  it('ignores dates already gone', () => {
    expect(webWhen(d('2026-10-01', '2026-10-24'), 'one-off', today)).toBe('Sat 24 Oct');
    expect(webWhen(d('2026-10-01'), 'one-off', today)).toBeNull();
  });

  it('writes regular and ongoing things by their end', () => {
    expect(webWhen(d('2026-10-24', '2026-10-31', '2026-11-07', '2026-11-14'), 'regular', today)).toBe('Every Saturday until 14 Nov');
    expect(webWhen(d('2026-10-17', '2026-10-18', '2027-12-31'), 'ongoing', today)).toBe('Until 31 Dec 2027');
    expect(webWhen(d('2026-11-26', '2026-12-20'), 'ongoing', today)).toBe('26 Nov – 20 Dec');
  });

  it('finds the next date', () => {
    expect(nextDate(d('2026-10-01', '2026-10-24', '2026-10-20'), today)).toBe('2026-10-20');
  });
});

describe('cardWhen', () => {
  it('gives scattered dates as the next one only', () => {
    expect(cardWhen(d('2026-10-18', '2026-11-07', '2026-11-08', '2026-11-14', '2026-11-21', '2026-12-05'), 'dates', today)).toBe('Sun 18 Oct');
    expect(cardWhen(d('2026-11-07', '2026-11-23'), 'one-off', today)).toBe('Sat 7 Nov');
  });
  it('keeps a single day, a run, and regular or ongoing things as they are', () => {
    expect(cardWhen(d('2026-10-24'), 'one-off', today)).toBe('Sat 24 Oct');
    expect(cardWhen(d('2026-10-31', '2026-11-01'), 'one-off', today)).toBe('Sat 31 Oct – Sun 1 Nov');
    expect(cardWhen(d('2026-10-24', '2026-10-31', '2026-11-07'), 'regular', today)).toBe(webWhen(d('2026-10-24', '2026-10-31', '2026-11-07'), 'regular', today));
  });
});
