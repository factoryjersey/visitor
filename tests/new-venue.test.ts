import { describe, expect, it } from 'vitest';
import { addedLine, isNewVenue } from '@/lib/domain/new-venue';

const now = new Date('2026-10-27T12:00:00Z');

describe('a new venue', () => {
  it('is new for six months from when it was first listed', () => {
    expect(isNewVenue('2026-10-19T09:00:00Z', now)).toBe(true);
    expect(isNewVenue('2026-04-28T09:00:00Z', now)).toBe(true);
    expect(isNewVenue('2026-04-26T09:00:00Z', now)).toBe(false);
  });

  it('is not new without a date, or with one still to come', () => {
    expect(isNewVenue(null, now)).toBe(false);
    expect(isNewVenue('2026-11-01T00:00:00Z', now)).toBe(false);
  });

  it('says when it was added', () => {
    expect(addedLine('2026-10-19T09:00:00Z')).toBe('Added October 2026');
  });
});
