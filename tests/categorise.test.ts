import { describe, expect, it } from 'vitest';
import { categorise, withCategories } from '@/lib/domain/categorise';

const types = (title: string, summary?: string, source?: string) => categorise({ title, summary }, source).sort();

describe('categorise', () => {
  // Real titles from Eventbrite and the charities' diary, October 2026.
  it('files family, seasonal and outdoor events', () => {
    expect(types('Family Spooky Bat-Spotting Saunter')).toEqual(['Family friendly', 'Outdoor', 'Seasonal']);
    expect(types('Abandon Ship Halloween 2026')).toEqual(['Seasonal']);
    expect(types('Woodland Wonders in Waterworks Valley')).toEqual(['Outdoor']);
    expect(types('Junior Tennis Camp')).toEqual(['Family friendly', 'Sports']);
  });

  it('files music and nights out', () => {
    expect(types("80's and 90's Disco Night")).toEqual(['Nightlife']);
    expect(types('GUNS 2 ROSES – LIVE AT THE DRIFT', 'The UK’s top Guns N’ Roses tribute band')).toEqual(['Music']);
    expect(types('Gala Opera Night fundraiser with the Diva Opera Company')).toEqual(['Charity', 'Music']);
    expect(types('Dove Days presents Ibiza Summer Party')).toEqual(['Music', 'Nightlife']);
  });

  it('files charity events, from their words or their source', () => {
    expect(types('Trekker Fundraising Quiz', null as never, 'jersey-charities')).toEqual(['Charity']);
    expect(types('BSK October Set Menu', null as never, 'jersey-charities')).toEqual(['Charity', 'Food & drink']);
    expect(types('Hospice Festive Market')).toEqual(['Charity', 'Markets & fairs', 'Seasonal']);
    expect(types("80's and 90's Disco Night", 'Join DJ Mel for a disco night, all proceeds to JCH')).toEqual(['Charity', 'Nightlife']);
  });

  it('marks business events, so review can turn them down', () => {
    expect(types('The PwC Wealth Management Report 2026')).toEqual(['Business & networking']);
    expect(types('Cyber Security Tabletop Exercise')).toEqual(['Business & networking']);
    expect(types('Planning Policy: Preserving the Past, Preparing for the Future')).toContain('Business & networking');
  });

  it('files wellbeing and sport without catching words inside words', () => {
    expect(types('Sound Bath Meditation')).toEqual(['Health & wellbeing']);
    expect(types('Golf Day')).toEqual(['Sports']);
    expect(types('Embrace the Start: a classic evening')).toEqual([]);
    // Running a process is not a run.
    expect(types('The Right Advice On: Running a Grievance Process')).not.toContain('Sports');
    expect(types('Jersey Spartans Running Club')).toEqual(['Sports']);
  });

  it('keeps a source’s own types and adds to them', () => {
    expect(withCategories(['Arts & cultural'], { title: 'Christmas Panto' })).toEqual(['Arts & cultural', 'Family friendly', 'Seasonal']);
  });

  it('is not fooled by Bat Out of Hell, a bar on the coast or Boxing Day', () => {
    expect(types('Bat Out of Hell 50th Anniversary Concert')).toEqual(['Music']);
    expect(types('Live Music at Coast Bar & Bistro')).toEqual(['Music']);
    expect(types('Boxing Day Afternoon Tea')).toEqual(['Food & drink']);
    expect(types('Jersey Bulls FC Home Games')).toEqual(['Sports']);
  });
});
