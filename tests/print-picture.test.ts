import { describe, expect, it } from 'vitest';
import { fileWords, matchPicture } from '@/lib/domain/print-picture';

const venues = [
  { id: 'atlantic', name: 'The Atlantic Hotel' },
  { id: 'cristina', name: 'Hotel Cristina' },
  { id: 'pearl', name: 'Jersey Pearl' },
  { id: 'pearl-cafe', name: 'Jersey Pearl Café' },
  { id: 'landes', name: 'Maison des Landes' },
  { id: 'museum', name: 'Jersey Museum' },
  { id: 'maritime', name: 'Maritime Museum' },
  { id: 'bonne-nuit', name: 'Bonne Nuit Hotel' },
];
const pick = (f: string) => matchPicture(f, venues).venue?.id ?? null;

describe('a print picture by its file name', () => {
  it('reads past numbers, editions and file litter', () => {
    expect([...fileWords('129926129997_atlantic.jpg')]).toEqual(['atlantic']);
    expect([...fileWords('bonne_nuit_vjvg_sq_26_1.jpg')]).toEqual(['bonne', 'nuit']);
  });

  it('finds the venue whose every telling word is there', () => {
    expect(pick('#50 will-holland-2023-the-atlantic-hotel-jersey.jpg')).toBe('atlantic');
    expect(pick('cristina sunset hero.jpg')).toBe('cristina');
    expect(pick('maison-des-landes.jpg')).toBe('landes');
    expect(pick('bonne_nuit_view.jpg')).toBe('bonne-nuit');
  });

  it('prefers the fuller name, and leaves an even tie to a person', () => {
    expect(pick('jersey_pearl_thumb.jpeg')).toBe('pearl');
    expect(pick('pearl-cafe-terrace.jpg')).toBe('pearl-cafe');
    expect(pick('museum.jpg')).toBe('museum');
    const twins = [{ id: 'a', name: 'Sands' }, { id: 'b', name: 'Sands' }];
    expect(matchPicture('sands.jpg', twins)).toEqual({ venue: null, tied: twins });
  });

  it('matches nothing from a camera name', () => {
    expect(pick('DJI_20250930120538_0872_D.jpg')).toBeNull();
    expect(pick('IMG_6991.PNG')).toBeNull();
  });
});
