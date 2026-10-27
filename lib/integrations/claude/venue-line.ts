import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '@/lib/env';

/**
 * The guide prints the venues that have not booked more space eight to a
 * page, a box each: the name, its label, one sentence and how to find it.
 * Claude writes the sentence from what the listing says. Twenty to a
 * request.
 *
 * Never in the way of an import: with no key, a refusal or any failure,
 * the venue has no line yet and the box cuts its longer copy instead.
 */

export const VENUE_LINE_MAX = 110;

export type VenueWords = { id: string; name: string; section: string; copy: string };

const SYSTEM = `You write the shortest copy for Visitor Guide, Jersey's official printed visitor guide, in British English.

For each venue, write one complete sentence of at most ${VENUE_LINE_MAX} characters with spaces that tells a visitor what the place is and what makes it worth going to. Its name, section, address and phone are printed beside it, so do not start with or repeat the name and do not give the address. Third person, plain and warm, not salesy: no exclamation marks, no capitals for emphasis, no superlatives the text cannot back up, no ellipses. Use only what the listing says. End with a full stop.`;

const SCHEMA = {
  type: 'object',
  properties: {
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, line: { type: 'string', description: `One sentence of at most ${VENUE_LINE_MAX} characters.` } },
        required: ['id', 'line'],
        additionalProperties: false,
      },
    },
  },
  required: ['lines'],
  additionalProperties: false,
} as const;

/** A line over the limit by more than a word's slack, or one that trails off, is no use to the box: it waits for the next run. */
const Result = z.object({ lines: z.array(z.object({ id: z.string(), line: z.string().trim() })) });
export const usableLine = (l: string) => l.length > 0 && l.length <= VENUE_LINE_MAX + 12 && !/(\.\.|…)/.test(l) && /[.?]$/.test(l);

const BATCH = 20;
let client: Anthropic | null = null;

export async function venueLines(items: VenueWords[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!env.ANTHROPIC_API_KEY) return out;
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 120_000, maxRetries: 1 });

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const listings = batch.map((v) => `<venue id="${v.id}">\nName: ${v.name}\nSection: ${v.section}\n${v.copy.slice(0, 3000)}\n</venue>`).join('\n\n');
    try {
      const message = await client.beta.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 8000,
        // A declined request is retried on Anthropic's recommended fallback model instead of failing.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: SYSTEM,
        messages: [{ role: 'user', content: `A line for each of these ${batch.length} venues, by id.\n\n${listings}` }],
      });
      if (message.stop_reason !== 'end_turn') {
        console.warn(`venue lines stopped: ${message.stop_reason}`);
        continue;
      }
      const json = message.content.find((b) => b.type === 'text')?.text;
      const parsed = Result.safeParse(json ? JSON.parse(json) : null);
      if (!parsed.success) continue;
      const ids = new Set(batch.map((v) => v.id));
      for (const { id, line } of parsed.data.lines) if (ids.has(id) && usableLine(line)) out.set(id, line);
    } catch (e) {
      console.warn(`venue lines failed: ${(e as Error).message}`);
    }
  }
  return out;
}
