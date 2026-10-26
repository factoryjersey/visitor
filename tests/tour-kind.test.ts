import { describe, expect, it } from 'vitest';
import { suggestGenre } from '@/lib/domain/genre';
import { tourKind } from '@/lib/domain/tour-kind';

// Visit Jersey's own list of tours and activities, October 2026, read from the title alone.
const kind = (title: string, tags: string[] = []) => tourKind(title, tags, suggestGenre(title, tags));

const TOURS = [
  "Let's Go Walk St. Martin!", 'Intertidal Walk to Seymour Tower', 'Bioluminescence – Intertidal Walk', 'Seabed Walk to Seymour Tower',
  'Jersey Pilgrimages: Walking The Wild Soul Way', 'Moonlight Walk to Seymour Tower', "'Wild West' e-Bike Tours", 'Bergerac Tour: Mystery of The Missing Chalice',
  'St. Helier Harbour Walk & Talk', 'The Oyster Trail', 'Les Minquiers Seafaris', 'North Coast Tidal Trail RIB Voyage', '4 Hour Kayaking Day Trip',
  '2¼ Hour Sea Kayak Tour', 'Les Ecrehous Wildlife RIB Voyage', 'Jersey Tidal Trail Seafari', 'Southwest Coast Boat Tour', 'Jet Ski Adventure Tour',
  'Flavours of Jersey: Island Panoramic Tour', 'Michelin Star Kitchen Tour, Wine Tasting & Canapes', "Luxury Chef's Tour: Market & Michelin Star Lunch",
  'Foraging Tour & Michelin Starred Tasting', 'Tours and Tasting Experiences', 'Flavours of Jersey: Foodie Tour with a Twist', 'Tantivy Blue Coach Tours',
  'Jersey Military Tours', 'Bay Tours Jersey', 'Jersey Bus Tours', 'Bunker Hunter WW2 Daytime Tours', 'Brutal Medieval Warfare Tour',
  'Self-Guided Occupation Trail', 'Self-Guided Liberation Trail', 'St. Helier – Occupation to Liberation Tour', 'Bunkers at Night Tour',
  'The Winery & Distillery Tour and Tasting Experiences', 'Coastal Kayak Tour', 'Coasteering Tour',
];

const EXPERIENCES = [
  'Gin Distillery Experience', "Children's Mocktails & Adult's Afternoon Tea", 'Cocktail Masterclasses', 'Aerial Trekking & Powerfan', 'Arena Splatmaster',
  'Zip Wire & King Swing', 'Arena Airsoft Experience', 'Climbing & Abseiling', 'Pick-a-Pearl Experience', 'Arena Paintball',
  'Behind the Scenes Animal Experiences', 'Battery Moltke Open Days', 'Strongpoint Corbiere Open Days', 'Gin & Rum Tasting Session at CI Liquor Co.', 'Beach Blokarting',
];

describe('tourKind', () => {
  it.each(TOURS)('%s is a tour', (title) => expect(kind(title)).toBe('tour'));
  it.each(EXPERIENCES)('%s is an experience', (title) => expect(kind(title)).toBe('experience'));

  it("goes by Visit Jersey's types when the title says neither", () => {
    expect(kind('Discover St. Helier!', ['Guided tours', 'History & culture tours'])).toBe('tour');
    expect(kind('Pottery with Clare', ['Activity sessions & classes'])).toBe('experience');
  });

  it('goes by the genre last, and calls the rest experiences', () => {
    expect(tourKind('Island Explorer', [], 'Motorised')).toBe('tour');
    expect(tourKind('Discover St. Helier!', [], 'On foot')).toBe('tour');
    expect(tourKind('Something by the sea', [], 'On the water')).toBe('experience');
  });
});
