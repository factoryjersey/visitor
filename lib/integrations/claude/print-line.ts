import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '@/lib/env';

/**
 * The guide prints six events to a page, and the smallest frame holds
 * three lines of copy. Claude writes each event a snippet of two
 * sentences that sums up what the listing says: the first fits the
 * smallest frame on its own, the two together a larger one. Twenty to a
 * request.
 *
 * Never in the way of an import: with no key, a refusal or any failure,
 * the event has no line yet and the guide cuts its longer copy instead.
 */

export const PRINT_LINE_MAX = 80;
export const PRINT_SNIPPET_MAX = 170;

export type Wordy = { id: string; title: string; summary: string | null; description: string | null };

const SYSTEM = `You write the shortest copy for Visitor Guide, Jersey's official printed visitor guide, in British English.

For each event, write a snippet of exactly two complete sentences that sums up what the listing says. The first sentence, at most ${PRINT_LINE_MAX} characters with spaces, says what the event is; it must make sense on its own, as it is sometimes printed alone. The second, which brings the whole snippet to at most ${PRINT_SNIPPET_MAX} characters, adds what to expect, who it suits or why to go. The title, date, time, price and venue are printed beside it, so do not repeat them and do not start with the event's name. Third person, plain and warm, not salesy: no exclamation marks, no capitals for emphasis, no superlatives the text cannot back up, no ellipses. Use only what the listing says. End each sentence with a full stop.`;

const SCHEMA = {
  type: 'object',
  properties: {
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, line: { type: 'string', description: `Two sentences, the first at most ${PRINT_LINE_MAX} characters, both at most ${PRINT_SNIPPET_MAX}.` } },
        required: ['id', 'line'],
        additionalProperties: false,
      },
    },
  },
  required: ['lines'],
  additionalProperties: false,
} as const;

/** A snippet over the limit by more than a word's slack, or one that trails off, is no use to the frame: it waits for the next run. */
const Result = z.object({ lines: z.array(z.object({ id: z.string(), line: z.string().trim() })) });
const usable = (l: string) => l.length > 0 && l.length <= PRINT_SNIPPET_MAX + 15 && !/(\.\.|…)/.test(l);

const BATCH = 20;
let client: Anthropic | null = null;

export async function printLines(items: Wordy[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!env.ANTHROPIC_API_KEY) return out;
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 120_000, maxRetries: 1 });

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const listings = batch
      .map((e) => `<event id="${e.id}">\nTitle: ${e.title}\n${[e.summary, e.description].filter(Boolean).join('\n\n').slice(0, 3000)}\n</event>`)
      .join('\n\n');
    try {
      const message = await client.beta.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 12000,
        // A declined request is retried on Anthropic's recommended fallback model instead of failing.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: SYSTEM,
        messages: [{ role: 'user', content: `A snippet for each of these ${batch.length} events, by id.\n\n${listings}` }],
      });
      if (message.stop_reason !== 'end_turn') {
        console.warn(`print lines stopped: ${message.stop_reason}`);
        continue;
      }
      const json = message.content.find((b) => b.type === 'text')?.text;
      const parsed = Result.safeParse(json ? JSON.parse(json) : null);
      if (!parsed.success) continue;
      const ids = new Set(batch.map((e) => e.id));
      for (const { id, line } of parsed.data.lines) if (ids.has(id) && usable(line)) out.set(id, line);
    } catch (e) {
      console.warn(`print lines failed: ${(e as Error).message}`);
    }
  }
  return out;
}
