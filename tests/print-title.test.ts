import { describe, expect, it } from 'vitest';
import { printTitle } from '@/lib/domain/house-style';

describe('headings in title case', () => {
  it('capitalises the words that carry it and keeps the small ones small', () => {
    expect(printTitle('Santa dash')).toBe('Santa Dash');
    expect(printTitle('An Island Christmas Carol at 16 New Street')).toBe('An Island Christmas Carol at 16 New Street');
    expect(printTitle('Bowel care and digital rectal skills course')).toBe('Bowel Care and Digital Rectal Skills Course');
    expect(printTitle('Peeling the onion: exploring South Hill’s military history')).toBe('Peeling the Onion: Exploring South Hill’s Military History');
    expect(printTitle('Jersey Bulls v Hartley Wintney')).toBe('Jersey Bulls v Hartley Wintney');
    expect(printTitle('a night to remember')).toBe('A Night to Remember');
    expect(printTitle('self-guided walk of the north coast')).toBe('Self-Guided Walk of the North Coast');
  });

  it('keeps what the source wrote with care', () => {
    expect(printTitle('AJC grant committee meeting')).toBe('AJC Grant Committee Meeting');
    expect(printTitle('Gilbert O’Sullivan: celebrating 60 years of music')).toBe('Gilbert O’Sullivan: Celebrating 60 Years of Music');
    expect(printTitle('Launching iNED in Jersey')).toBe('Launching iNED in Jersey');
    expect(printTitle('Legally Blonde Tuesday 1st December')).toBe('Legally Blonde Tuesday 1st December');
  });

  it('cases a shouted title again', () => {
    expect(printTitle('THE OCHE CLUB BRUNCH SOCIAL')).toBe('The Oche Club Brunch Social');
  });
});
