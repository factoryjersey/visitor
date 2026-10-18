import { describe, expect, it } from 'vitest';
import {
  printAddress,
  printContact,
  printDates,
  printParish,
  printPrice,
  printTimes,
  printWebsite,
} from '@/lib/domain/house-style';

// Expected strings are copied from the printed autumn 2026 edition.

const d = (...isos: string[]) => isos.map((date) => ({ date, start: null, end: null }));
const range = (from: string, to: string, step = 1) => {
  const out: string[] = [];
  for (let t = Date.parse(from); t <= Date.parse(to); t += step * 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
};

describe('printDates', () => {
  it('prints a single date', () => {
    expect(printDates(d('2026-10-26'))).toBe('26 OCT');
  });

  it('prints a short run as a range, across a month too', () => {
    expect(printDates(d(...range('2026-09-01', '2026-09-05')))).toBe('1 - 5 SEP');
    expect(printDates(d(...range('2026-09-30', '2026-10-04')))).toBe('30 SEP - 4 OCT');
  });

  it('prints two dates with an ampersand', () => {
    expect(printDates(d('2026-09-01', '2026-09-15'))).toBe('1 SEP & 15 SEP');
  });

  it('prints a long, mostly daily run as UNTIL', () => {
    expect(printDates(d(...range('2026-09-01', '2026-10-29')))).toBe('1 SEP UNTIL 29 OCT');
  });

  it('groups the rest by month after the first date', () => {
    expect(printDates(d('2026-09-01', '2026-09-03', '2026-09-08', '2026-09-10', '2026-09-15', '2026-09-17', '2026-09-22', '2026-09-24')))
      .toBe('1 SEP, 3/8/10/15/17/22/24 SEP');
    expect(printDates(d('2026-09-04', '2026-10-02', '2026-11-06'))).toBe('4 SEP, 2 OCT, 6 NOV');
    expect(printDates(d('2026-09-06', '2026-09-20', '2026-10-04', '2026-10-18', '2026-11-07', '2026-11-08')))
      .toBe('6 SEP, 20 SEP, 4/18 OCT, 7/8 NOV');
  });

  it('keeps only dates inside the edition', () => {
    const all = d(...range('2026-10-17', '2027-12-31'));
    expect(printDates(all, { from: '2026-11-01', to: '2027-02-28' })).toBe('1 NOV UNTIL 28 FEB');
    expect(printDates(all, { from: '2028-01-01', to: '2028-03-31' })).toBeNull();
  });
});

describe('printTimes', () => {
  it('prints one time range', () => {
    expect(printTimes([{ date: '2026-09-01', start: '10:00', end: '16:00' }])).toBe('10:00-16:00');
  });

  it('prints two show times with a comma', () => {
    expect(printTimes([{ date: '2026-06-06', start: '15:00', end: null }, { date: '2026-06-06', start: '19:30', end: null }]))
      .toBe('15:00, 19:30');
  });

  it('prints differing hours with a bar', () => {
    expect(printTimes([
      { date: '2026-06-04', start: '18:30', end: '23:00' },
      { date: '2026-06-05', start: '9:30', end: '23:00' },
    ])).toBe('18:30-23:00 | 9:30-23:00');
  });
});

describe('the rest of an entry', () => {
  it('prints prices to the penny', () => {
    expect(printPrice(1145, 2450)).toBe('£11.45 - £24.50');
    expect(printPrice(500, null)).toBe('£5.00');
    expect(printPrice(null, null, { free: true })).toBe('Free entry');
    expect(printPrice(null, null)).toBeNull();
  });

  it('prints the website as a bare domain in capitals', () => {
    expect(printWebsite('https://www.jerseyheritage.org/whats-on/x')).toBe('JERSEYHERITAGE.ORG');
    expect(printWebsite('jerseyoperahouse.ticketsolve.com/shows/1')).toBe('JERSEYOPERAHOUSE.TICKETSOLVE.COM');
    expect(printWebsite(null)).toBeNull();
  });

  it('prints the parish with a full stop, and the address in order', () => {
    expect(printParish('St Martin')).toBe('St. Martin');
    expect(printParish('Grouville')).toBe('Grouville');
    expect(printAddress({ addressLine1: 'Castle Green', parish: 'St Martin', postcode: 'JE3 6ET' })).toBe('Castle Green, St. Martin, JE3 6ET');
  });

  it('prints a phone, or the email when there is none', () => {
    expect(printContact('+44 (0) 1534 633300', 'a@b.je')).toBe('+44 (0) 1534 633300');
    expect(printContact(null, 'drink@curfew.je')).toBe('drink@curfew.je');
  });
});
