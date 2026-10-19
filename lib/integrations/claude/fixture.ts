import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '@/lib/env';
import { CLUBS, fixtureTitle, type Fixture } from '@/lib/integrations/fixtures/parse';
import type { Rewrite } from './rewrite';

/**
 * A club's fixtures page gives two names, a day and a kick-off. Thirty
 * home games would read the same if the guide wrote them from a template,
 * so Claude writes each one: a line about the two clubs meeting, and the
 * card's sentence. With no key or any failure, the caller keeps a plain
 * line of its own (plainCopy).
 */

const SYSTEM = `You write match listings for Visitor, Jersey's what's on guide, in British English, for visitors deciding how to spend an afternoon or evening.

Each listing is one home match on the island. Write:
- description: two or three sentences. The first is about the two clubs meeting: who the Jersey side are and who the visitors are, where they come from and what brings them together, such as the league they share. Then what the match is like to go to, and that kick-off and tickets are worth checking with the club.
- snippet: one sentence of at most 25 words for the listing card, specific to this match. Do not start it with the match title, which the card already shows.

Use the facts given and only what is widely known and certain about a club, such as the town it comes from. Never invent results, form, league positions, players, nicknames, founding years or history. If you know nothing sure about the visitors, say only what their name and the competition tell you. Plain and warm, no exclamation marks, no superlatives.`;

const SCHEMA = {
  type: 'object',
  properties: {
    description: { type: 'string', description: 'Two or three sentences about this match.' },
    snippet: { type: 'string', description: 'One sentence for the listing card, at most 25 words.' },
  },
  required: ['description', 'snippet'],
  additionalProperties: false,
} as const;

const Result = z.object({ description: z.string().trim().min(1).max(2000), snippet: z.string().trim().min(1).max(600) });

/** What the guide knows of its own clubs, so Claude need not guess at them. */
const ABOUT: Record<Fixture['club'], string> = {
  bulls:
    'Jersey Bulls are the island’s football club in the English non-league pyramid, playing home games at Springfield Stadium in St Helier. Their women’s and under-23 sides also play there.',
  jrfc: 'Jersey RFC are the island’s senior rugby union club, playing in the English national leagues at their ground on La Rue des Landes, St Peter.',
};

let client: Anthropic | null = null;

export async function fixtureCopy(f: Fixture): Promise<Rewrite | null> {
  if (!env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 1 });
  const club = CLUBS[f.club];
  const facts = [
    `Match: ${fixtureTitle(f)} (${club.sport})`,
    `Home side: ${f.home}. ${ABOUT[f.club]}`,
    `Visitors: ${f.away}`,
    f.competition ? `Competition: ${f.competition}` : null,
    `Ground: ${f.venue ?? club.venue}`,
    `Day: ${f.date}${f.kickoff ? `, kick-off ${f.kickoff}` : ', kick-off to be confirmed'}`,
  ].filter(Boolean);
  try {
    const message = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: `<match>\n${facts.join('\n')}\n</match>` }],
    });
    if (message.stop_reason !== 'end_turn') return null;
    const json = message.content.find((b) => b.type === 'text')?.text;
    const parsed = Result.safeParse(json ? JSON.parse(json) : null);
    return parsed.success ? parsed.data : null;
  } catch (e) {
    console.warn(`match copy for "${fixtureTitle(f)}" failed: ${(e as Error).message}`);
    return null;
  }
}
