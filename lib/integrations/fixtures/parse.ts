import { slugify } from '@/lib/domain/slug';
import type { VjEvent } from '@/lib/integrations/jersey-com/parse';
import { decodeEntities } from '@/lib/integrations/jersey-com/parse';

/**
 * Home matches from the island's two big clubs' own sites: Jersey Bulls'
 * fixtures (bulls.je/fixtures, men, women and U23 together) and Jersey
 * RFC's fixtures and results (jrfc.je/results). Neither has a feed, so the
 * pages are read as written. Only home games go on the guide, the ones a
 * visitor can get to: Jersey named first.
 */

export type Club = 'bulls' | 'jrfc';

export type Fixture = {
  club: Club;
  id: string;
  home: string;
  away: string;
  date: string;
  kickoff: string | null;
  competition: string | null;
  venue: string | null;
  link: string;
};

export const BULLS_FIXTURES = 'https://www.bulls.je/fixtures/?team=all';
export const JRFC_FIXTURES = 'https://jrfc.je/results/';

const text = (html: string | undefined) => decodeEntities((html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** "Tue 20 Oct 2026", "31 Oct 2026" to 2026-10-31. */
export function dayOf(s: string): string | null {
  const m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/.exec(s);
  const month = m ? MONTHS.indexOf(m[2]!.toLowerCase()) : -1;
  return m && month >= 0 ? `${m[3]}-${pad(month + 1)}-${pad(Number(m[1]))}` : null;
}

const timeOf = (s: string) => {
  const m = /\b(\d{1,2}):(\d{2})\b/.exec(s);
  return m ? `${pad(Number(m[1]))}:${m[2]}` : null;
};

/** Jersey first is a home game. */
export const isHome = (f: Pick<Fixture, 'home'>) => /^jersey\b/i.test(f.home);

/** Each `fixture-card` article: competition, the two clubs in order, kick-off, day, ground, match centre. */
export function parseBulls(html: string): Fixture[] {
  const out: Fixture[] = [];
  for (const card of html.split(/<article class="bulls-fixture-card"/).slice(1)) {
    const block = card.slice(0, card.indexOf('</article>'));
    const clubs = [...block.matchAll(/<span class="bulls-club__name">([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
    const date = dayOf(text(/bulls-fixture-card__date">([\s\S]*?)<\/span>/.exec(block)?.[1]));
    const link = /href="(https:\/\/www\.bulls\.je\/event\/[^"]+)"/.exec(block)?.[1];
    if (clubs.length !== 2 || !date || !link) continue;
    out.push({
      club: 'bulls',
      id: link.replace(/\/$/, '').split('/').pop()!,
      home: clubs[0]!,
      away: clubs[1]!,
      date,
      kickoff: timeOf(text(/bulls-fixture-card__kickoff">([\s\S]*?)<\/span>/.exec(block)?.[1])),
      competition: text(/bulls-fixture-card__competition">([\s\S]*?)<\/p>/.exec(block)?.[1]) || null,
      venue: text(/bulls-fixture-card__venue">([\s\S]*?)<\/span>/.exec(block)?.[1]) || null,
      link,
    });
  }
  return out;
}

/**
 * Each `result-card`: the two sides in order, then a score or "vs", the
 * day and a chip that is the result or "KO 14:00". Played matches, with a
 * score, are left out; the page names neither competition nor ground, and
 * every home match is at the club's ground in St Peter.
 */
export function parseJrfc(html: string): Fixture[] {
  const out: Fixture[] = [];
  for (const card of html.split(/<div class="card result-card/).slice(1)) {
    const sides = [...card.matchAll(/result-card__team-name[^"]*">([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
    const date = dayOf(text(/<small[^>]*>([\s\S]*?)<\/small>/.exec(card)?.[1]));
    const chip = text(/class="result-chip[^"]*">([\s\S]*?)<\/span>/.exec(card)?.[1]);
    const played = !/<span class="result-score[^"]*"[^>]*>\s*vs\s*<\/span>/.test(card);
    if (sides.length !== 2 || !date || played) continue;
    out.push({
      club: 'jrfc',
      id: `${date}-${slugify(sides[0]!)}-v-${slugify(sides[1]!)}`,
      home: sides[0]!,
      away: sides[1]!,
      date,
      kickoff: /^KO\b/i.test(chip) ? timeOf(chip) : null,
      competition: null,
      venue: null,
      link: JRFC_FIXTURES,
    });
  }
  return out;
}

/** The home club as the guide names it, its ground, and its own site for tickets. */
export const CLUBS: Record<Club, { name: (home: string) => string; venue: string; parish: string; postcode: string | null; website: string; sport: string }> = {
  bulls: { name: (home) => home, venue: 'Springfield Stadium', parish: 'St Helier', postcode: null, website: 'https://www.bulls.je/tickets/', sport: 'football' },
  // The page calls the side "Jersey"; on a guide that could be any of the island's teams.
  jrfc: { name: () => 'Jersey RFC', venue: 'Jersey Rugby Club', parish: 'St Peter', postcode: 'JE3 7BG', website: 'https://jrfc.je/', sport: 'rugby union' },
};

export const fixtureTitle = (f: Fixture) => `${CLUBS[f.club].name(f.home)} v ${f.away}`;

/** The plain line a fixture gets when Claude has not written one: still its own, as it names both sides. */
export function plainCopy(f: Fixture): { snippet: string; description: string } {
  const club = CLUBS[f.club];
  const where = f.venue ?? club.venue;
  const comp = f.competition ? ` in the ${f.competition}` : '';
  const snippet = `${club.name(f.home)} host ${f.away}${comp} at ${where}.`;
  return { snippet, description: `${snippet} Check kick-off and tickets with the club before you go.` };
}

export function toEvent(f: Fixture, copy: { snippet: string; description: string }): VjEvent {
  const club = CLUBS[f.club];
  const dates = [{ date: f.date, start: f.kickoff, end: null }];
  const venue = f.venue ?? club.venue;
  return {
    externalId: f.id,
    title: fixtureTitle(f),
    summary: copy.snippet,
    description: copy.description,
    venue,
    venueName: venue,
    addressLine1: f.club === 'jrfc' ? 'La Rue des Landes' : null,
    parish: club.parish,
    postcode: club.postcode,
    phone: null,
    email: null,
    website: f.club === 'bulls' ? f.link : club.website,
    eventTypes: ['Sports', 'Spectator'],
    free: false,
    occurrence: 'one-off',
    lat: null,
    lon: null,
    dates,
    startsOn: f.date,
    endsOn: f.date,
    fromPricePence: null,
    toPricePence: null,
    headerImage: null,
    sourceLink: f.link,
    organiser: f.club === 'bulls' ? 'Jersey Bulls' : 'Jersey RFC',
    modifiedAt: null,
    portalSyncedAt: null,
  };
}
