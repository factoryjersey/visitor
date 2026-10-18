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

  it('calls a weekly session regular', () => {
    expect(classifyOccurrence(run('2026-09-05', 12, 7))).toBe('regular');
  });

  it('calls daily opening, an exhibition or a bookable-any-day tour ongoing', () => {
    expect(classifyOccurrence(run('2026-10-17', 441))).toBe('ongoing');
    expect(classifyOccurrence(run('2026-09-01', 25))).toBe('ongoing');
  });

  it('calls a fortnight of nightly shows specific dates, not ongoing', () => {
    expect(classifyOccurrence(run('2026-12-18', 14))).toBe('dates');
    expect(classifyOccurrence(run('2026-04-01', 149))).toBe('ongoing');
  });

  it('calls a tour listed daily for the next fortnight on demand, but not a show', () => {
    expect(classifyOccurrence(run('2026-10-18', 12), { tour: true })).toBe('ongoing');
    expect(classifyOccurrence(run('2026-10-18', 12))).toBe('dates');
    expect(classifyOccurrence(['2026-09-02', '2026-09-13', '2026-09-16', '2026-09-27', '2026-10-07', '2026-11-08'], { tour: true })).toBe('dates');
  });

  it('calls closed-Mondays opening ongoing, not regular', () => {
    const tueToSun = run('2026-09-01', 60).filter((d) => new Date(d).getUTCDay() !== 1);
    expect(classifyOccurrence(tueToSun)).toBe('ongoing');
  });

  it('calls the same few weekdays, week after week, regular', () => {
    // Elizabeth Castle's costumed guides, half-term 2026.
    expect(classifyOccurrence(['2026-10-20', '2026-10-22', '2026-10-27', '2026-10-29'])).toBe('regular');
    expect(classifyOccurrence(['2026-10-17', '2026-10-21', '2026-10-23', '2026-10-24', '2026-10-28', '2026-10-30', '2026-10-31'])).toBe('regular');
  });

  it('keeps a few weekdays within one week, or ones that skip most weeks, as dates', () => {
    expect(classifyOccurrence(['2026-10-20', '2026-10-21', '2026-10-23', '2026-10-24'])).not.toBe('regular');
    expect(classifyOccurrence(['2026-09-02', '2026-09-13', '2026-09-16', '2026-09-27', '2026-10-07', '2026-11-08'])).toBe('dates');
  });

  it('calls a daytime programme every day for more than a week ongoing, but not a run of evening shows', () => {
    const days = run('2026-10-17', 16);
    expect(classifyOccurrence(days, { starts: days.map(() => '10:00') })).toBe('ongoing');
    expect(classifyOccurrence(days, { starts: days.map(() => '19:30') })).toBe('dates');
    // A panto with matinées: some evenings, so still an event.
    expect(classifyOccurrence(days, { starts: days.map((_, i) => (i % 2 ? '14:00' : '19:00')) })).toBe('dates');
    // A week of daytime activities is still a one-off.
    const week = run('2027-02-08', 5);
    expect(classifyOccurrence(week, { starts: week.map(() => '10:00') })).toBe('one-off');
  });
});
