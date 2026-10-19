import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '@/lib/env';

/**
 * The guide prints six events to a page, and the smallest frame holds
 * three lines of copy. Claude writes each event one sentence that fits
 * it, from the listing's own words, twenty to a request.
 *
 * Never in the way of an import: with no key, a refusal or any failure,
 * the event has no line yet and the guide cuts its longer copy instead.
 */

export const PRINT_LINE_MAX = 80;

export type Wordy = { id: string; title: string; summary: string | null; description: string | null };

const SYSTEM = `You write the shortest copy for Visitor Guide, Jersey's official printed visitor guide, in British English.

For each event, write one sentence of at most ${PRINT_LINE_MAX} characters, spaces included, saying what it is and why a visitor would go. The title, date, time, price and venue are printed beside it, so do not repeat them and do not start with the event's name. Third person, plain and warm, not salesy: no exclamation marks, no capitals for emphasis, no superlatives the text cannot back up. Use only what the listing says. End with a full stop.`;

const SCHEMA = {
  type: 'object',
  properties: {
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, line: { type: 'string', description: `One sentence, at most ${PRINT_LINE_MAX} characters.` } },
        required: ['id', 'line'],
        additionalProperties: false,
      },
    },
  },
  required: ['lines'],
  additionalProperties: false,
} as const;

/** A line over the limit by more than a word's slack is no use to the frame: it waits for the next run. */
const Result = z.object({ lines: z.array(z.object({ id: z.string(), line: z.string().trim().min(1).max(PRINT_LINE_MAX + 10) })) });

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
        max_tokens: 8000,
        // A declined request is retried on Anthropic's recommended fallback model instead of failing.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: SYSTEM,
        messages: [{ role: 'user', content: `One line for each of these ${batch.length} events, by id.\n\n${listings}` }],
      });
      if (message.stop_reason !== 'end_turn') {
        console.warn(`print lines stopped: ${message.stop_reason}`);
        continue;
      }
      const json = message.content.find((b) => b.type === 'text')?.text;
      const parsed = Result.safeParse(json ? JSON.parse(json) : null);
      if (!parsed.success) continue;
      const ids = new Set(batch.map((e) => e.id));
      for (const { id, line } of parsed.data.lines) if (ids.has(id)) out.set(id, line);
    } catch (e) {
      console.warn(`print lines failed: ${(e as Error).message}`);
    }
  }
  return out;
}
