import { describe, expect, it } from 'vitest';
import { joinRuns, runTitle, showName } from '@/lib/domain/join-runs';

const night = (externalId: string, title: string, date: string, venueName: string | null = 'JCG Senior School Hall') => ({
  externalId, title, venueName, dates: [{ date, start: '19:30', end: '21:30' }], startsOn: date, endsOn: date, occurrence: 'one-off' as const, fromPricePence: 1200, toPricePence: 1600,
});

describe('one show sold night by night', () => {
  it('knows the nights are the same show', () => {
    expect(showName('Legally Blonde Tuesday 1st December')).toBe(showName('Legally Blonde Saturday 5th December'));
    expect(showName('Midnight Joanna – Matinee')).toBe(showName('Midnight Joanna – Evening'));
    expect(showName('Christmas Bingo')).not.toBe(showName('Christmas Fayre'));
  });

  it('titles the run without the night', () => {
    expect(runTitle('Legally Blonde Tuesday 1st December')).toBe('Legally Blonde');
    expect(runTitle('Fundraiser Evening – Midnight Joanna')).toBe('Fundraiser – Midnight Joanna');
    expect(runTitle('Quiz Night at the Ommaroo Hotel')).toBe('Quiz Night at the Ommaroo Hotel');
  });

  it('lists the run once with every date, carried by the first night', () => {
    const { events, joined } = joinRuns([
      night('1', 'Legally Blonde Tuesday 1st December', '2026-12-01'),
      night('2', 'Legally Blonde Wednesday 2nd December', '2026-12-02'),
      night('3', 'Legally Blonde Thursday 3rd December', '2026-12-03'),
      night('9', 'Christmas Bingo', '2026-12-04'),
    ]);
    expect(events.map((e) => [e.externalId, e.title, e.dates.length])).toEqual([['1', 'Legally Blonde', 3], ['9', 'Christmas Bingo', 1]]);
    expect([...joined]).toEqual([['2', '1'], ['3', '1']]);
  });

  it('leaves alone two listings with no venue to say they are one', () => {
    expect(joinRuns([night('1', 'Christmas Fayre', '2026-12-05', null), night('2', 'Christmas Fayre', '2026-12-06', null)]).events).toHaveLength(2);
  });
});
