import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { isHome, parseBulls, parseJrfc, plainCopy, toEvent } from '@/lib/integrations/fixtures/parse';

vi.mock('@/lib/env', () => ({ env: { ANTHROPIC_API_KEY: undefined } }));

describe('Jersey Bulls fixtures', () => {
  const all = parseBulls(readFileSync('tests/fixtures/bulls-fixtures.html', 'utf8'));

  it('reads every card, the two clubs in order', () => {
    expect(all.length).toBe(38);
    expect(all[0]).toEqual({
      club: 'bulls',
      id: 'jersey-bulls-v-moneyfields-2026-10-20',
      home: 'Jersey Bulls',
      away: 'Moneyfields',
      date: '2026-10-20',
      kickoff: '20:00',
      competition: 'Isthmian League South Central Division',
      venue: 'Springfield Stadium',
      link: 'https://www.bulls.je/event/jersey-bulls-v-moneyfields-2026-10-20/',
    });
  });

  it('keeps only home matches, the women’s among them, every one at Springfield', () => {
    const home = all.filter(isHome);
    expect(home.map((f) => f.away)).toContain('Croydon Women');
    expect(home.map((f) => f.away)).not.toContain('Jersey Bulls');
    expect(new Set(home.map((f) => f.venue))).toEqual(new Set(['Springfield Stadium']));
  });

  it('leaves the time empty when the club has not set one', () => {
    expect(all.find((f) => f.away === 'Binfield')!.kickoff).toBeNull();
  });

  it('decodes the visitors’ names', () => {
    expect(all.some((f) => f.away === 'Hayes & Yeading United')).toBe(true);
  });
});

describe('Jersey RFC fixtures', () => {
  const all = parseJrfc(readFileSync('tests/fixtures/jrfc-results.html', 'utf8'));

  it('leaves out matches already played', () => {
    expect(all.map((f) => f.date).every((d) => d >= '2026-10-31')).toBe(true);
    expect(all.length).toBe(19);
  });

  it('keeps Jersey-first matches, with the kick-off from the chip, or none for TBC', () => {
    const home = all.filter(isHome);
    expect(home.map((f) => f.away)).toEqual(['Oundle', 'Canterbury', 'Westcombe Park', 'Leicester Lions', 'Henley', 'O Albanian', 'Esher', 'Havant', 'Barnes']);
    expect(home[0]).toMatchObject({ date: '2026-11-07', kickoff: '15:15', id: '2026-11-07-jersey-v-oundle' });
    expect(home.find((f) => f.away === 'O Albanian')!.kickoff).toBeNull();
  });

  it('becomes a guide event at the club’s ground, named so a visitor knows which Jersey', () => {
    const f = all.filter(isHome)[0]!;
    const e = toEvent(f, plainCopy(f));
    expect(e.title).toBe('Jersey RFC v Oundle');
    expect(e.venueName).toBe('Jersey Rugby Club');
    expect(e.parish).toBe('St Peter');
    expect(e.dates).toEqual([{ date: '2026-11-07', start: '15:15', end: null }]);
    expect(e.eventTypes).toEqual(['Sports', 'Spectator']);
    expect(e.summary).toBe('Jersey RFC host Oundle at Jersey Rugby Club.');
  });
});

describe('fixtureCopy', () => {
  it('writes nothing without a key, so the plain line stands', async () => {
    const { fixtureCopy } = await import('@/lib/integrations/claude/fixture');
    const [f] = parseJrfc(readFileSync('tests/fixtures/jrfc-results.html', 'utf8'));
    expect(await fixtureCopy(f!)).toBeNull();
  });
});
