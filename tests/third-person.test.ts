import { describe, expect, it } from 'vitest';
import { needsThird, printedWords, sameButForPerson, thirdKey } from '@/lib/domain/third-person';

describe('needsThird', () => {
  it('finds the first person, in any case', () => {
    expect(needsThird('Join us for an evening of jazz.')).toBe(true);
    expect(needsThird('We are open all summer.')).toBe(true);
    expect(needsThird('Our guides know every rock pool.')).toBe(true);
    expect(needsThird('I’ll show you the island’s secret coves.')).toBe(true);
  });
  it('leaves the third person, "you", and the US alone', () => {
    expect(needsThird('A guided walk along the north coast cliffs.')).toBe(false);
    expect(needsThird('Bring your own picnic; you will need boots.')).toBe(false);
    expect(needsThird('A blues band from the US.')).toBe(false);
    expect(needsThird('Museums, music and more.')).toBe(false);
  });
});

describe('sameButForPerson', () => {
  const original = 'Join us at the harbour for a sunset kayak tour. Our guides will show you the caves.';
  it('takes an edit of the person only', () => {
    expect(sameButForPerson(original, 'Join Kayak Nomad at the harbour for a sunset kayak tour. Their guides will show you the caves.')).toBe(true);
    expect(sameButForPerson('We are a family-run farm with alpacas.', 'Le Ferme is a family-run farm with alpacas.')).toBe(true);
  });
  it('refuses a rewrite, a cut or a polish', () => {
    expect(sameButForPerson(original, 'Kayak Nomad runs sunset kayak tours from the harbour, exploring sea caves with expert guides.')).toBe(false);
    expect(sameButForPerson(original, 'Join Kayak Nomad at the harbour for a sunset kayak tour.')).toBe(false);
    expect(sameButForPerson(original, 'Join Kayak Nomad at the harbour for a magical sunset kayak tour, with lots of wildlife and fun along the way. Their friendly guides will show you the caves.')).toBe(false);
  });
});

describe('printedWords', () => {
  const short = '<p>Join us for a night of music.</p>\n';
  it('prints the third person when it was made from these words', () => {
    const payload = { acf: { short_description: short }, _third: { key: thirdKey('Join us for a night of music.'), text: 'Join the Arts Centre for a night of music.' } };
    expect(printedWords(payload)).toBe('Join the Arts Centre for a night of music.');
  });
  it('prints their words when they have changed since, or there is none', () => {
    const stale = { acf: { short_description: short }, _third: { key: thirdKey('Something else.'), text: 'Old.' } };
    expect(printedWords(stale)).toBe('Join us for a night of music.');
    expect(printedWords({ acf: { short_description: short } })).toBe('Join us for a night of music.');
    expect(printedWords({ acf: {} })).toBeNull();
  });
});
