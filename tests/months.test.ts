import { describe, expect, it } from 'vitest';
import { addMonths, monthFromPath, monthPath, monthRange, monthTitle } from '@/lib/domain/months';

describe('month pages', () => {
  it('goes between a month and its address', () => {
    expect(monthPath('2026-11')).toBe('/whats-on/2026/november');
    expect(monthFromPath('2026', 'november')).toBe('2026-11');
    expect(monthFromPath('2026', 'November')).toBe('2026-11');
    expect(monthFromPath('2026', 'novembre')).toBeNull();
    expect(monthFromPath('26', 'november')).toBeNull();
  });

  it('counts months across the new year', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2027-01', -1)).toBe('2026-12');
  });

  it('knows a month’s first and last day, and its name', () => {
    expect(monthRange('2027-02')).toEqual({ from: '2027-02-01', to: '2027-02-28' });
    expect(monthRange('2026-12')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
    expect(monthTitle('2026-11')).toBe('November 2026');
  });
});
