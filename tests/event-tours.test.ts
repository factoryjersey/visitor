import { describe, expect, it } from 'vitest';
import { asTourTitle, tourProviderOf } from '@/lib/domain/event-tours';
import { runsWeekly } from '@/lib/domain/occurrence';

const providers = [{ name: 'Stroll in Jersey', aliases: [] }, { name: 'Jersey Heritage', aliases: [] }, { name: 'Jersey', aliases: [] }];

describe('tours listed as events', () => {
  it('finds the provider whose name opens the title', () => {
    expect(tourProviderOf('Stroll In Jersey Twilight Walk St. Peter Route 2', providers)?.name).toBe('Stroll in Jersey');
    expect(tourProviderOf('Family Day: Christmas Crafts', providers)).toBeNull();
    expect(tourProviderOf('Jersey Bulls v Binfield', providers)).toBeNull();
    expect(tourProviderOf('Jersey Heritage', providers)).toBeNull();
  });
  it('takes the name off the title', () => {
    expect(asTourTitle('Stroll In Jersey Twilight Walk St. Peter Route 2', providers[0]!)).toBe('Twilight Walk St. Peter Route 2');
    expect(asTourTitle('Something Else', providers[0]!)).toBe('Something Else');
  });
});

describe('runsWeekly', () => {
  const inWinter = (s: string) => s.split(' ').filter((d) => d >= '2026-12-01' && d <= '2027-02-28');
  it('reads every weekend, every Tuesday, and Thursdays and Fridays as weekly', () => {
    expect(runsWeekly(inWinter('2026-11-21 2026-11-22 2026-11-28 2026-11-29 2026-12-05 2026-12-06 2026-12-12 2026-12-13 2026-12-19 2026-12-20 2026-12-26 2026-12-27'))).toBe(true);
    expect(runsWeekly(inWinter('2026-11-24 2026-12-01 2026-12-08 2026-12-15 2026-12-22 2026-12-29'))).toBe(true);
    expect(runsWeekly(inWinter('2026-11-26 2026-11-27 2026-12-03 2026-12-04 2026-12-10 2026-12-11 2026-12-17 2026-12-18 2026-12-24 2026-12-25 2026-12-31'))).toBe(true);
  });
  it('keeps tide walks and odd dates dated', () => {
    expect(runsWeekly(inWinter('2026-12-04 2026-12-05 2026-12-19 2026-12-20 2027-01-01 2027-01-02 2027-01-03 2027-01-04 2027-01-15 2027-01-18 2027-01-19 2027-02-17 2027-02-18'))).toBe(false);
    expect(runsWeekly(inWinter('2026-12-27 2027-01-07 2027-01-08 2027-01-09 2027-01-10 2027-02-05 2027-02-07 2027-02-08 2027-02-20'))).toBe(false);
    expect(runsWeekly(inWinter('2026-12-13 2026-12-23 2026-12-27 2027-02-10 2027-02-13'))).toBe(false);
    expect(runsWeekly(inWinter('2026-12-06 2026-12-13'))).toBe(false);
  });
});
