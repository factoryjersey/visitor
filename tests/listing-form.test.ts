import { describe, expect, it } from 'vitest';
import { changedFields, datesText, derivedFromDates, parseDates, parseListingForm, parsePence } from '@/lib/domain/listing-form';

describe('parsePence', () => {
  it('reads pounds as pence', () => {
    expect(parsePence('£12.50')).toBe(1250);
    expect(parsePence('12')).toBe(1200);
    expect(parsePence('1,200')).toBe(120000);
    expect(parsePence(' ')).toBeNull();
    expect(parsePence('12.505')).toBe('invalid');
    expect(parsePence('twelve')).toBe('invalid');
  });
});

describe('parseDates', () => {
  it('reads one date a line, with optional times, sorted and without repeats', () => {
    const { dates, bad } = parseDates('2026-11-14 19:30-22:00\n\n2026-11-07\n2026-11-14 19:30\n2026-11-21 9.30');
    expect(bad).toEqual([]);
    expect(dates).toEqual([
      { date: '2026-11-07', start: null, end: null },
      { date: '2026-11-14', start: '19:30', end: '22:00' },
      { date: '2026-11-21', start: '09:30', end: null },
    ]);
  });

  it('reports lines it cannot read', () => {
    expect(parseDates('14/11/2026\n2026-02-30\n2026-11-14 25:00\n2026-11-14').bad).toEqual(['14/11/2026', '2026-02-30', '2026-11-14 25:00']);
  });

  it('round-trips through the form text', () => {
    const text = '2026-11-07\n2026-11-14 19:30-22:00\n2026-11-21 09:30';
    expect(datesText(parseDates(text).dates)).toBe(text);
  });
});

describe('parseListingForm', () => {
  it('keeps only provider fields, so a form cannot set ours', () => {
    const r = parseListingForm('venue', { name: ' The Gallery ', category: 'see', inclusion: 'included', guideCopy: 'x', website: 'example.je' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.name).toBe('The Gallery');
    expect(r.values.website).toBe('https://example.je');
    expect(r.values.summary).toBeNull();
    expect('inclusion' in r.values).toBe(false);
    expect('guideCopy' in r.values).toBe(false);
  });

  it('says what is wrong, field by field', () => {
    const r = parseListingForm('event', { title: '', dates: 'soon', fromPricePence: 'abc', email: 'nope' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(['dates', 'email', 'fromPricePence', 'title']);
  });

  it('reads an event: prices, free, venue', () => {
    const r = parseListingForm('event', { title: 'Jazz night', dates: '2026-11-14 19:30', fromPricePence: '10', toPricePence: '15.5', free: 'on', placeId: '' });
    expect(r.ok && r.values).toMatchObject({ fromPricePence: 1000, toPricePence: 1550, free: true, placeId: null });
  });

  it('refuses a price range the wrong way round', () => {
    const r = parseListingForm('experience', { title: 'Walk', dates: '2026-11-14', fromPricePence: '20', toPricePence: '10' });
    expect(r.ok).toBe(false);
  });
});

describe('derivedFromDates', () => {
  const dates = [{ date: '2026-11-14', start: null, end: null }, { date: '2026-11-15', start: null, end: null }];
  it('sets an event’s range and occurrence', () => {
    expect(derivedFromDates('event', dates, [])).toEqual({ startsOn: '2026-11-14', endsOn: '2026-11-15', occurrence: 'one-off' });
  });
  it('leaves a locked occurrence alone', () => {
    expect(derivedFromDates('experience', dates, ['occurrence'])).toEqual({});
  });
});

describe('changedFields', () => {
  it('returns only what differs, comparing JSON by value', () => {
    const current = { title: 'A', dates: [{ end: null, date: '2026-11-14', start: '19:30' }], phone: null };
    const next = { title: 'A', dates: [{ date: '2026-11-14', start: '19:30', end: null }], phone: '01534 000000' };
    expect(changedFields(current, next)).toEqual({ phone: '01534 000000' });
  });
});
