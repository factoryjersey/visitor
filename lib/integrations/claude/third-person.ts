import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '@/lib/env';
import { fromTheirLong, sameButForPerson } from '@/lib/domain/third-person';

/**
 * Two versions of each of Visit Jersey's short descriptions for print
 * (lib/domain/third-person.ts says why and checks each):
 *
 *   short: the short description in the third person, changing only the
 *          first person ("join us", "our guides") to the organiser by name,
 *          every other word as written;
 *   more:  a sentence or two from their long description to follow it in
 *          the grid of six's bigger box, adding what the short one does
 *          not say, in their words as far as possible and in the third
 *          person; nothing from anywhere else.
 *
 * An edit that fails the checks is not used: the short description prints
 * as they wrote it.
 */

const SYSTEM = `You edit copy for Visitor Guide, Jersey's official printed visitor guide, in British English.

Each listing has the organiser's own short description and, usually, their long description. Return two things for each.

short: the short description in the third person, changing as little as possible. Replace only first-person words (we, our, us, ourselves, I, my, me, and phrases built on them such as "join us" or "come and see us") with the organiser's name, "the team", "the organisers" or the like, and adjust the verb that goes with them (we are → the team is). Change nothing else: keep every other word, the punctuation, the capitals, the spelling and the order exactly as they are, even where you would write it differently. Do not shorten, expand, correct or improve it. Leave "you" and "your" as they are. If there is no first person, return it exactly as given.

more: one or two sentences to print straight after the short description, so the two together fill the room given, taken from the long description: the useful facts the short description does not already give (what you do or see, what is included, who it suits, where it starts, what to bring). Use the long description's own words and phrases as far as possible, put in the third person the same way. Add nothing that is not in the long description, do not repeat what the short description says, and leave out booking instructions, prices, dates and times, links, phone numbers and emails, which the guide prints elsewhere. The short description, a space and more must not exceed the room given; stop at a whole sentence. Return "" when the long description adds nothing useful or there is no room.`;

const SCHEMA = {
  type: 'object',
  properties: {
    texts: {
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'string' }, short: { type: 'string' }, more: { type: 'string' } }, required: ['id', 'short', 'more'], additionalProperties: false },
    },
  },
  required: ['texts'],
  additionalProperties: false,
} as const;
const Result = z.object({ texts: z.array(z.object({ id: z.string(), short: z.string().trim(), more: z.string().trim() })) });

export type ThirdItem = { id: string; organiser: string | null; title: string; text: string; long: string | null; room: number };

const BATCH = 15;
let client: Anthropic | null = null;

/** The printed versions of each description, by id; a short one that fails the check, or any failure, is left out, and a "more" that fails is dropped. */
export async function thirdPerson(items: ThirdItem[]): Promise<Map<string, { short: string; more: string }>> {
  const out = new Map<string, { short: string; more: string }>();
  if (!env.ANTHROPIC_API_KEY) return out;
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 180_000, maxRetries: 1 });
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const listings = batch
      .map((x) => `<listing id="${x.id}">\nOrganiser: ${x.organiser ?? 'unknown'}\nTitle: ${x.title}\nRoom: ${x.room} characters\nShort description: ${x.text}\nLong description: ${x.long ?? '(none)'}\n</listing>`)
      .join('\n\n');
    try {
      const message = await client.beta.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: SYSTEM,
        messages: [{ role: 'user', content: `The short and more for each of these ${batch.length} listings, by id.\n\n${listings}` }],
      });
      if (message.stop_reason !== 'end_turn') continue;
      const json = message.content.find((b) => b.type === 'text')?.text;
      const parsed = Result.safeParse(json ? JSON.parse(json) : null);
      if (!parsed.success) continue;
      const given = new Map(batch.map((x) => [x.id, x]));
      for (const { id, short, more } of parsed.data.texts) {
        const x = given.get(id);
        if (!x || !short || !sameButForPerson(x.text, short)) continue;
        out.set(id, { short, more: x.long && fromTheirLong(more, x.long, x.organiser, x.room, short) ? more : '' });
      }
    } catch (e) {
      console.warn(`third person failed: ${(e as Error).message}`);
    }
  }
  return out;
}
