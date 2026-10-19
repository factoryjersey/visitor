import { describe, expect, it } from 'vitest';
import { classifyOccurrence } from '@/lib/domain/occurrence';

const run = (from: string, n: number, step = 1) =>
  Array.from({ length: n }, (_, i) => new Date(Date.parse(from) + i * step * 86_400_000).toISOString().slice(0, 10));

describe('classifyOccurrence', () => {
  it('calls a single date, two dates or a short festival one-off', () => {
    expect(classifyOccurrence(['2026-10-26'])).toBe('one-off');
    expect(classifyOccurrence(['2026-09-01', '2026-09-15'])).toBe('one-off');
    expect(classifyOccurrence(run('2026-09-01', 5))).toBe('one-off');
  });

  it('calls tide-dependent walks specific dates', () => {
    expect(classifyOccurrence(['2026-09-02', '2026-09-13', '2026-09-16', '2026-09-27', '2026-10-07', '2026-11-08'])).toBe('dates');
  });

  it('shows what is on for a limited time, every day or not', () => {
    // A fortnight of nightly shows, a three-week exhibition, a daytime half-term programme.
    expect(classifyOccurrence(run('2026-12-18', 14))).toBe('dates');
    expect(classifyOccurrence(run('2026-09-01', 25))).toBe('dates');
    const halfTerm = run('2026-10-17', 16);
    expect(classifyOccurrence(halfTerm, { starts: halfTerm.map(() => '10:00') })).toBe('dates');
    // Elizabeth Castle's costumed guides, Tuesdays and Thursdays of half-term.
    expect(classifyOccurrence(['2026-10-20', '2026-10-22', '2026-10-27', '2026-10-29'])).toBe('dates');
  });

  it('shows the Christmas market on its four weekends', () => {
    const weekends = ['2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06', '2026-12-07', '2026-12-11', '2026-12-12', '2026-12-13', '2026-12-14', '2026-12-17', '2026-12-18', '2026-12-19', '2026-12-20'];
    expect(classifyOccurrence(weekends)).toBe('dates');
  });

  it('shows a season of home matches on their days', () => {
    // Jersey Bulls at Springfield, 2026–27.
    const bulls = ['2026-10-17', '2026-10-20', '2026-10-31', '2026-11-14', '2026-11-28', '2026-12-05', '2026-12-28', '2027-01-09', '2027-01-16', '2027-01-30', '2027-02-13', '2027-02-27', '2027-03-06', '2027-03-20', '2027-03-27', '2027-04-03', '2027-04-17'];
    expect(classifyOccurrence(bulls)).toBe('dates');
    // A match every other Saturday all season is still not every week.
    expect(classifyOccurrence(run('2026-09-05', 16, 14))).toBe('dates');
  });

  it('keeps back what is always there: open most days for more than six weeks', () => {
    expect(classifyOccurrence(run('2026-10-17', 441))).toBe('ongoing');
    expect(classifyOccurrence(run('2026-04-01', 149))).toBe('ongoing');
    const tueToSun = run('2026-09-01', 60).filter((d) => new Date(d).getUTCDay() !== 1);
    expect(classifyOccurrence(tueToSun)).toBe('ongoing');
  });

  it('keeps back the same session every week for more than six weeks', () => {
    expect(classifyOccurrence(run('2026-09-05', 12, 7))).toBe('regular');
    const weekends = run('2026-05-02', 120).filter((d) => [0, 6].includes(new Date(d).getUTCDay()));
    expect(classifyOccurrence(weekends)).toBe('regular');
    // Six weeks of a weekly course is a course: on for a while, then gone.
    expect(classifyOccurrence(run('2026-09-05', 6, 7))).toBe('dates');
  });

  it('calls a tour listed daily for the next fortnight on demand, but not a show', () => {
    expect(classifyOccurrence(run('2026-10-18', 12), { tour: true })).toBe('ongoing');
    expect(classifyOccurrence(run('2026-10-18', 12))).toBe('dates');
    expect(classifyOccurrence(['2026-09-02', '2026-09-13', '2026-09-16', '2026-09-27', '2026-10-07', '2026-11-08'], { tour: true })).toBe('dates');
  });
});
