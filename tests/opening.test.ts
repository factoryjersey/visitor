import { describe, expect, it } from 'vitest';
import { hoursText, openingText, reopensIn, weekHours, windowMonths } from '@/lib/domain/opening';

const day = (opens: string, closes: string, isOpen = '1') => ({ opens, closes, is_open: isOpen });

describe('opening hours', () => {
  it('reads Visit Jersey’s week, leaving out closed days and hidden hours', () => {
    const raw = { monday: day('', '', '0'), tuesday: day('10:00', '17:00'), sunday: day('9:30', '17.00') };
    expect(weekHours(raw)).toEqual({ tue: ['10:00', '17:00'], sun: ['09:30', '17:00'] });
    expect(weekHours(raw, true)).toBeNull();
    expect(weekHours({ monday: day('', '', '0') })).toBeNull();
  });

  it('prints the week as runs of days', () => {
    const all = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, ['10:00', '17:00']]));
    expect(hoursText(all)).toBe('Daily 10:00–17:00');
    expect(hoursText({ ...all, mon: undefined })).toBe('Tue–Sun 10:00–17:00');
    expect(hoursText({ ...all, sun: ['10:00', '15:00'] })).toBe('Mon–Sat 10:00–17:00, Sun 10:00–15:00');
    expect(hoursText({ ...all, tue: undefined })).toBe('Mon, Wed–Sun 10:00–17:00');
  });

  it('puts the season first when it does not open all year', () => {
    expect(openingText({ tue: ['10:00', '17:00'] }, [4, 5, 6, 7, 8, 9, 10])).toBe('Apr–Oct · Tue 10:00–17:00');
    expect(openingText(null, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBeNull();
  });

  it('says when a place closed for the edition opens again', () => {
    const winter = windowMonths('2026-11-01', '2027-02-28');
    expect(winter).toEqual([11, 12, 1, 2]);
    expect(reopensIn([4, 5, 6, 7, 8, 9, 10], winter)).toBe(4);
    expect(reopensIn([3, 4, 5, 6, 7, 8, 9, 10, 11, 12], winter)).toBe(3);
    expect(reopensIn([2, 3, 4, 5, 6, 7, 8, 9, 10, 11], winter)).toBe(2);
    expect(reopensIn([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], winter)).toBeNull();
    expect(reopensIn([], winter)).toBeNull();
    expect(reopensIn([4, 5, 6, 7, 8, 9, 10], windowMonths('2026-06-01', '2026-08-31'))).toBeNull();
  });
});
