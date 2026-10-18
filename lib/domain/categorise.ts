/**
 * Event types from what an event says about itself, for sources that give
 * none (Eventbrite, the charities' diary) or too few. Visit Jersey's own
 * labels are the vocabulary, so one filter covers every source, with a few
 * it lacks: Charity, Nightlife, Talks & learning, Markets & fairs, and
 * Business & networking, which marks what is not for visitors so it is
 * quick to turn down in review.
 *
 * Words, not guesses: each type is a list of patterns over the title and
 * copy, the title weighed first. Pure, so a misfiled event becomes a test.
 */

type Rule = { type: string; title?: RegExp; text?: RegExp };

const RULES: Rule[] = [
  {
    type: 'Business & networking',
    title: /\b(networking|conference|seminar|webinar|briefing|cpd|summit|agm|masterclass for|leadership|investor|wealth management|compliance|cyber[- ]security|tabletop exercise|awards? (ceremony|dinner)|policy|regulation|accountan|fintech|careers? fair|recruitment|business breakfast|chamber of commerce)\b/i,
  },
  {
    type: 'Charity',
    title: /\b(charity|charities|fundrais\w*|in aid of|appeal|sponsored|raffle|hospice|cancer relief|macmillan|rnli|nspcc|blood cancer)\b/i,
    text: /\b(in aid of|all proceeds|raising (money|funds)|fundrais\w*|registered charity|charity (night|event|dinner|quiz))\b/i,
  },
  {
    type: 'Family friendly',
    title: /\b(family|families|kids?|children'?s?|toddlers?|junior|half[- ]term|storytime|story time|teddy|panto(mime)?|santa|easter egg|trick or treat|under (5|8|10|12)s?|baby|babies|youth|teens?)\b/i,
    text: /\b(suitable for (all ages|children|families)|all the family|family[- ]friendly|for kids|children (welcome|aged))\b/i,
  },
  {
    type: 'Music',
    title: /\b(music|concert|gig|live band|choir|choral|orchestra|symphon\w*|jazz|blues|folk|opera|acoustic|tribute|recital|singer|songwriter|band|unplugged|quartet|ensemble|ibiza|dj)\b/i,
    text: /\b(tribute (band|act|show)|live music|live band|in concert|the band|headlin\w*)\b/i,
  },
  {
    type: 'Nightlife',
    title: /\b(club night|disco|rave|party|dj|karaoke|after dark|ibiza|bottomless|silent disco)\b/i,
  },
  {
    type: 'Sports',
    title: /\b(parkrun|fun run|\d+ ?k (run|race)|running|marathon|triathlon|duathlon|swim(ming)?|golf|tennis|padel|football|rugby|cricket|hockey|netball|cycl\w*|sportive|regatta|sailing|race|tournament|match|boxing(?! day)|climbing|\bfc|home games?|surf\w*|paddleboard\w*|kayak\w*)\b/i,
  },
  {
    type: 'Health & wellbeing',
    title: /\b(yoga|pilates|meditation|sound bath|wellbeing|well-being|wellness|mindful\w*|breathwork|reiki|retreat|mental health|fitness|tai chi|qigong)\b/i,
  },
  {
    type: 'Food & drink',
    title: /\b(food|dinner|lunch|brunch|breakfast|supper|tasting|wine|gin|cocktails?|beer|cider|whisky|menu|feast|afternoon tea|bbq|barbecue|chef|cookery|cooking|street food)\b/i,
  },
  {
    type: 'Arts & cultural',
    title: /\b(theatre|theater|musical|film|cinema|screening|exhibition|gallery|art|arts|artist|comedy|comedian|stand[- ]up|dance|ballet|poetry|book (launch|signing)|author|literary|drama|performance|play reading|ceramics|painting|life drawing|sculpture|photography)\b/i,
  },
  {
    type: 'Talks & learning',
    title: /\b(talk|lecture|workshop|course|class|classes|seminar|q&a|in conversation|introduction to|learn|learning|lesson)\b/i,
  },
  {
    type: 'History & Heritage',
    title: /\b(history|historic(al)?|heritage|castle|occupation|museum|archaeolog\w*|liberation|wartime|war tunnels|bunker|norman|medieval)\b/i,
  },
  {
    type: 'Outdoor',
    title: /\b(walk|walking|hike|ramble|beach|outdoor|garden|gardens|nature|wildlife|birds?|bats|bat[- ](?:walk|spotting|watch\w*|detect\w*)|foraging|forage|coastal|coast path|coastline|cliff|woodland|wood|trail|stargazing|rock ?pool\w*)\b/i,
  },
  {
    type: 'Seasonal',
    title: /\b(halloween|spooky|ghost|christmas|xmas|festive|santa|easter|bonfire|fireworks|new year|valentine'?s?|carols?|advent|harvest)\b/i,
  },
  { type: 'Festivals', title: /\b(festival|fête|fete|carnival)\b/i },
  { type: 'Markets & fairs', title: /\b(market|craft fair|fair|car boot|bazaar|pop[- ]up shop|makers)\b/i },
];

/** Types a source always means, whatever the event says. */
const BY_SOURCE: Record<string, string[]> = { 'jersey-charities': ['Charity'] };

export function categorise(e: { title: string; summary?: string | null; description?: string | null }, source?: string): string[] {
  const text = [e.summary, e.description].filter(Boolean).join(' ');
  const found = new Set<string>(source ? (BY_SOURCE[source] ?? []) : []);
  for (const r of RULES) {
    if (r.title?.test(e.title) || (r.text && r.text.test(text))) found.add(r.type);
  }
  return [...found];
}

/** The source's own types first, then any these rules add. */
export function withCategories(existing: readonly string[], e: Parameters<typeof categorise>[0], source?: string): string[] {
  return [...new Set([...existing, ...categorise(e, source)])];
}
