import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '@/lib/env';
import type { ListingKind } from '@/lib/db/schema';

/**
 * Providers write about themselves: "we", "our", "join us". The guide
 * speaks about them. Claude turns their description into the guide's
 * third person and writes the one sentence a listing card shows.
 *
 * Never in the way of a save: with no key, a refusal or any failure, the
 * caller keeps what the provider wrote.
 */

export type Rewrite = { description: string; snippet: string };

const KIND_NOUN: Record<ListingKind, string> = { venue: 'place', event: 'event', experience: 'tour or experience' };

const SYSTEM = `You edit listings for Visitor Guide, Jersey's official visitor guide, in British English.

Businesses write their own listings, often in the first person ("we", "our", "join us", "I"). Rewrite them in the third person, as the guide describing them to a visitor: name the business or use "the team", "the venue", "the hosts" where the text said "we"; turn invitations to "join us" into what happens and who it is for.

Keep every fact: names, dates, times, prices, places, what is included, who it suits, how to book. Add nothing that is not in the text, and leave out nothing a visitor needs. Keep the length and paragraphs roughly as they are, separated by a blank line. Plain and warm, not salesy: drop exclamation marks, capitals for emphasis and superlatives the text cannot back up. Where the text is already in the third person, change only what the rules above need.

Then write the snippet: one sentence of at most 25 words for the listing's card, saying what it is and why a visitor would go. Do not start it with the listing's name, which the card already shows, and do not end it with an exclamation mark.`;

const SCHEMA = {
  type: 'object',
  properties: {
    description: { type: 'string', description: 'The listing text in the third person, paragraphs separated by a blank line.' },
    snippet: { type: 'string', description: 'One sentence for the listing card, at most 25 words.' },
  },
  required: ['description', 'snippet'],
  additionalProperties: false,
} as const;

/** What comes back is checked again here: the fields' own limits, so a save never fails on Claude's account. */
const Result = z.object({ description: z.string().trim().min(1).max(6000), snippet: z.string().trim().min(1).max(600) });

let client: Anthropic | null = null;

export async function rewriteListing(input: {
  kind: ListingKind;
  name: string;
  summary: string | null;
  description: string | null;
}): Promise<Rewrite | null> {
  const text = [input.summary, input.description].filter(Boolean).join('\n\n').trim();
  if (!env.ANTHROPIC_API_KEY || !text) return null;
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 1 });

  try {
    const message = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // A declined request is retried on Anthropic's recommended fallback model instead of failing.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `A ${KIND_NOUN[input.kind]} called "${input.name}".\n\n<listing>\n${text}\n</listing>`,
        },
      ],
    });
    if (message.stop_reason !== 'end_turn') {
      console.warn(`rewrite of "${input.name}" stopped: ${message.stop_reason}`);
      return null;
    }
    const json = message.content.find((b) => b.type === 'text')?.text;
    const parsed = Result.safeParse(json ? JSON.parse(json) : null);
    return parsed.success ? parsed.data : null;
  } catch (e) {
    console.warn(`rewrite of "${input.name}" failed: ${(e as Error).message}`);
    return null;
  }
}
