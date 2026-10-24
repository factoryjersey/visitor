import { describe, expect, it } from 'vitest';
import { nameOverlap, pickGooglePlace, type GoogleCandidate } from '@/lib/domain/google-match';

const atlantic = { name: 'The Atlantic Hotel', lat: 49.1987, lon: -2.2252 };
const g = (id: string, name: string, lat: number | null, lon: number | null, address = 'Le Mont de la Pulente, St Brelade, Jersey JE3 8HE'): GoogleCandidate => ({ id, name, address, lat, lon });

describe('matching a venue to its Google place', () => {
  it('lets Google name it at greater length', () => {
    expect(nameOverlap('The Atlantic Hotel', 'Atlantic Hotel Jersey')).toBe(1);
    expect(nameOverlap('Bohemia', 'Bohemia Bar & Restaurant')).toBe(1);
    expect(nameOverlap('Hotel de France', 'Grand Jersey Hotel')).toBe(0);
  });

  it('needs the name and the place to agree', () => {
    expect(pickGooglePlace(atlantic, [g('far', 'Atlantic Hotel', 49.18, -2.1), g('here', 'Atlantic Hotel Jersey', 49.1989, -2.2249)])?.id).toBe('here');
    expect(pickGooglePlace(atlantic, [g('other', 'Jersey Pearl', 49.1988, -2.2251)])).toBeNull();
  });

  it('takes a venue without a pin only on its whole name and a Jersey address', () => {
    const ours = { name: 'Samphire', lat: null, lon: null };
    expect(pickGooglePlace(ours, [g('s', 'Samphire', 49.18, -2.1, '7-11 Don St, St Helier, Jersey JE2 4TQ')])?.id).toBe('s');
    expect(pickGooglePlace(ours, [g('s', 'Samphire', 51.5, -0.1, '1 High Street, London')])).toBeNull();
    expect(pickGooglePlace(ours, [g('s', 'Samphire Fine Foods', 49.18, -2.1, 'St Helier, Jersey JE2 4TQ')])?.id).toBe('s');
  });
});
