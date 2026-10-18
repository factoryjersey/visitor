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
});
