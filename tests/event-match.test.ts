import { describe, expect, it } from 'vitest';
import { findSameEvent, titleSimilarity } from '@/lib/domain/event-match';
import { parishOf } from '@/lib/domain/parish';
import { mergeFromSource } from '@/lib/domain/merge';

const on = (...days: string[]) => days.map((date) => ({ date, start: null, end: null }));

describe('findSameEvent', () => {
  const existing = [
    { id: 'vj', title: 'Seven Drunken Nights – The Story of The Dubliners', dates: on('2026-12-18'), placeId: 'opera' },
    { id: 'quiz', title: 'Charity Quiz Night', dates: on('2026-11-07'), placeId: 'royal' },
  ];

  it('finds the same night under another source’s wording', () => {
    expect(findSameEvent({ title: 'Seven Drunken Nights: The Story of the Dubliners', dates: on('2026-12-18') }, existing)?.id).toBe('vj');
  });

  it('needs a date in common', () => {
    expect(findSameEvent({ title: 'Seven Drunken Nights: The Story of the Dubliners', dates: on('2027-01-08') }, existing)).toBeNull();
  });

  it('does not join different events on the same night', () => {
    expect(findSameEvent({ title: "80's and 90's Disco Night", dates: on('2026-11-07'), placeId: 'royal' }, existing)).toBeNull();
  });

  it('accepts a looser title at the same venue', () => {
    expect(findSameEvent({ title: 'Quiz Night for Jersey Hospice', dates: on('2026-11-07'), placeId: 'royal' }, existing)?.id).toBe('quiz');
    expect(titleSimilarity('Quiz Night for Jersey Hospice', 'Charity Quiz Night')).toBeLessThan(0.75);
  });
});

describe('parishOf', () => {
  it('reads English, French and loose spellings, and nothing else', () => {
    expect(parishOf('Saint-Brélade')).toBe('St Brelade');
    expect(parishOf('Saint-Pierre')).toBe('St Peter');
    expect(parishOf('St. Ouen')).toBe('St Ouen');
    expect(parishOf('Saint Helier')).toBe('St Helier');
    expect(parishOf('trinity')).toBe('Trinity');
    expect(parishOf('Jersey')).toBeNull();
    expect(parishOf('channel islands')).toBeNull();
    expect(parishOf('St')).toBeNull();
  });
});

describe('mergeFromSource fillOnly', () => {
  const stamp = { source: 'eventbrite', ref: 'e/1', at: '2026-10-18' };
  it('fills gaps and leaves what another source said', () => {
    const { patch } = mergeFromSource<Record<string, unknown>>(
      { title: 'From Visit Jersey', summary: null, fromPricePence: null },
      { title: 'From Eventbrite', summary: 'A summary', fromPricePence: 1500 },
      { locked: [], fieldSources: { title: { source: 'visit-jersey', ref: 'events/1', at: 'x' } }, stamp, fillOnly: true },
    );
    expect(patch).toEqual({ summary: 'A summary', fromPricePence: 1500 });
  });

  it('keeps updating the fields it filled itself', () => {
    const { patch } = mergeFromSource<Record<string, unknown>>(
      { summary: 'Old' },
      { summary: 'New' },
      { locked: [], fieldSources: { summary: stamp }, stamp, fillOnly: true },
    );
    expect(patch).toEqual({ summary: 'New' });
  });
});
