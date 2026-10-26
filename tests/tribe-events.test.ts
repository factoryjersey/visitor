import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SITES, island, joinPerformances, toEvent, tribeDates, type TribeEvent } from '@/lib/integrations/tribe-events/parse';

const events = (JSON.parse(readFileSync('tests/fixtures/tribe-events.json', 'utf8')) as { events: TribeEvent[] }).events;
const site = SITES[0];
const parsed = events.map((e) => toEvent(e, site)).filter((e) => e !== null);

describe('The Events Calendar (Island Ticket Hut)', () => {
  it('leaves out Guernsey’s nights, by postcode or name', () => {
    const titles = parsed.map((e) => e.title);
    expect(titles.some((t) => t.startsWith('Moonshine'))).toBe(false);
    expect(titles.some((t) => t.includes('Mental Health First Aid'))).toBe(false);
    expect(titles).toContain('Fundraiser Evening – Midnight Joanna');
  });

  it('reads a Jersey night whole: time, venue, price, picture, organiser', () => {
    const e = parsed.find((x) => x.title === 'Fundraiser Evening – Midnight Joanna')!;
    expect(e.dates).toEqual([{ date: '2026-11-07', start: '18:00', end: expect.any(String) }]);
    expect(e.venueName).toBe('The Sundown');
    expect(e.fromPricePence).toBe(2200);
    expect(e.free).toBe(false);
    expect(e.headerImage?.url).toMatch(/^https:\/\/www\.islandtickethut\.com\//);
    expect(e.organiser).toBe('Ant Noel');
    expect(e.website).toBe(e.sourceLink);
  });

  it('calls a free night free', () => {
    expect(parsed.find((x) => x.title.startsWith('Taste of North Africa'))!.free).toBe(true);
  });

  it('tells the islands apart, and admits when it cannot', () => {
    expect(island({ venue: 'The Sundown', address: '4 Wharf St, St Helier, Jersey JE2 3NF' })).toBe('jersey');
    expect(island({ venue: 'Les Cotils', zip: 'GY1 1UU' })).toBe('guernsey');
    expect(island({ venue: 'Fermain Tavern, Guernsey', address: 'Fort Road' })).toBe('guernsey');
    expect(island({ venue: 'Somewhere', address: 'Main Road' })).toBeNull();
  });

  it('spreads a run over its days', () => {
    expect(tribeDates({ start_date: '2026-10-22 09:00:00', end_date: '2026-10-23 17:00:00' }).map((d) => d.date)).toEqual(['2026-10-22', '2026-10-23']);
  });

  it('lists a show once with each performance, matinee and evening', () => {
    const shows = joinPerformances(parsed).filter((e) => e.title.includes('Midnight Joanna'));
    expect(shows).toHaveLength(1);
    expect(shows[0]!.title).toBe('Fundraiser – Midnight Joanna');
    expect(shows[0]!.dates.map((d) => d.start)).toEqual(['12:30', '18:00']);
    expect(shows[0]!.fromPricePence).toBe(1500);
    expect(shows[0]!.toPricePence).toBe(2200);
  });
});
