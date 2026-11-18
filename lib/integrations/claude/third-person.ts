import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '@/lib/env';
import { sameButForPerson } from '@/lib/domain/third-person';

/**
 * Visit Jersey's short descriptions print as they wrote them, but the
 * guide speaks in the third person: "Join us for…" reads as the guide's
 * own voice. This changes the first person only ("we", "our", "us", "join
 * us", "I") to the organiser by name, and nothing else: every other word,
 * the punctuation and the order stay as written. A description with no
 * first person is never sent. An edit that changes more than that is not
 * used: the original prints instead.
 * The checks and the kept copy: lib/domain/third-person.ts.
 */

const SYSTEM = `You edit copy for Visitor Guide, Jersey's official printed visitor guide, in British English.

Each listing is an organiser's own short description. Put it in the third person, changing as little as possible: replace only first-person words (we, our, us, ourselves, I, my, me, and phrases built on them such as "join us" or "come and see us") with the organiser's name, "the team", "the organisers" or the like, and adjust the verb that goes with them (we are → the team is). Change nothing else: keep every other word, the punctuation, the capitals, the spelling and the order exactly as they are, even where you would write it differently. Do not shorten, expand, correct or improve it. Leave "you" and "your" as they are.`;

const SCHEMA = {
  type: 'object',
  properties: {
    texts: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, text: { type: 'string' } }, required: ['id', 'text'], additionalProperties: false } },
  },
  required: ['texts'],
  additionalProperties: false,
} as const;
const Result = z.object({ texts: z.array(z.object({ id: z.string(), text: z.string().trim() })) });

export type ThirdItem = { id: string; organiser: string | null; title: string; text: string };

const BATCH = 20;
let client: Anthropic | null = null;

/** The third-person version of each description that needs one, by id; one that fails the check, or any failure, is left out. */
export async function thirdPerson(items: ThirdItem[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!env.ANTHROPIC_API_KEY) return out;
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 120_000, maxRetries: 1 });
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const listings = batch.map((x) => `<listing id="${x.id}">\nOrganiser: ${x.organiser ?? 'unknown'}\nTitle: ${x.title}\nDescription: ${x.text}\n</listing>`).join('\n\n');
    try {
      const message = await client.beta.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 12000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: SYSTEM,
        messages: [{ role: 'user', content: `Each of these ${batch.length} descriptions in the third person, by id.\n\n${listings}` }],
      });
      if (message.stop_reason !== 'end_turn') continue;
      const json = message.content.find((b) => b.type === 'text')?.text;
      const parsed = Result.safeParse(json ? JSON.parse(json) : null);
      if (!parsed.success) continue;
      const given = new Map(batch.map((x) => [x.id, x.text]));
      for (const { id, text } of parsed.data.texts) {
        const original = given.get(id);
        if (original && text && sameButForPerson(original, text)) out.set(id, text);
      }
    } catch (e) {
      console.warn(`third person failed: ${(e as Error).message}`);
    }
  }
  return out;
}
