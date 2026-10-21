import Anthropic from '@anthropic-ai/sdk';
import { and, eq, gte, isNotNull, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { events, experiences, type Image } from '@/lib/db/schema';
import { webImage } from '@/lib/domain/images';
import { env } from '@/lib/env';

/**
 * Posters, flyers and pictures with a title set over them crop badly in
 * the printed guide's frames and clash with its own type. Claude looks
 * at each event and tour picture once and says whether it is one of those; the
 * answer is kept on the picture with the address it was given for, so a
 * new picture is looked at again and an old one never is.
 *
 * Never in the way of an import: a picture that cannot be looked at
 * stays unchecked and is tried again next time; the guide prints an
 * unchecked picture as before.
 */

const SYSTEM = `You check pictures for a printed visitor guide, which crops each into a wide strip beside its own typeset text. Say whether the picture is made of words as much as of a photograph or illustration: a poster, flyer, ticket artwork, banner, menu, screenshot, or a photograph with a title, dates, prices or other text set over it. Small incidental text in a scene (a shop sign, a shirt sponsor, a name on a boat) does not count, nor does a small logo in a corner.`;

const SCHEMA = {
  type: 'object',
  properties: { designedText: { type: 'boolean', description: 'True if the picture is a poster, flyer, banner or has text set over it.' } },
  required: ['designedText'],
  additionalProperties: false,
} as const;
const Result = z.object({ designedText: z.boolean() });

let client: Anthropic | null = null;

/** True if the picture is mostly designed text; null if it could not be looked at. */
export async function hasDesignedText(image: Image): Promise<boolean | null> {
  if (!env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 1 });
  try {
    const message = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'url', url: webImage(image, 1000, 700) } }, { type: 'text', text: 'Is this picture designed text?' }] }],
    });
    if (message.stop_reason !== 'end_turn') return null;
    const json = message.content.find((b) => b.type === 'text')?.text;
    const parsed = Result.safeParse(json ? JSON.parse(json) : null);
    return parsed.success ? parsed.data.designedText : null;
  } catch (e) {
    console.warn(`picture check failed for ${image.url}: ${(e as Error).message}`);
    return null;
  }
}

/**
 * After the import: every public event still to come with a picture of
 * its own (stock and club photographs are not printed anyway) and not
 * yet checked, or checked for an earlier picture.
 */
export async function checkEventPictures(): Promise<{ checked: number; withText: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const listed = (t: typeof events | typeof experiences) => and(eq(t.review, 'approved'), ne(t.inclusion, 'excluded'), isNotNull(t.headerImage), sql`(${t.headerImage}->'credit') is null`);
  const [eventRows, tourRows] = await Promise.all([
    db.select({ id: events.id, image: events.headerImage }).from(events).where(and(gte(events.endsOn, today), listed(events))),
    db.select({ id: experiences.id, image: experiences.headerImage }).from(experiences).where(listed(experiences)),
  ]);
  let checked = 0;
  let withText = 0;
  for (const [table, rows] of [[events, eventRows], [experiences, tourRows]] as const) {
    for (const r of rows) {
      const image = r.image!;
      if (image.text && image.text.url === image.url) continue;
      const found = await hasDesignedText(image);
      if (found === null) continue;
      // Only the check is written, so a picture changed in the meantime is not overwritten.
      await db
        .update(table)
        .set({ headerImage: sql`jsonb_set(${table.headerImage}, '{text}', ${JSON.stringify({ found, url: image.url, at: new Date().toISOString() })}::jsonb)` })
        .where(and(eq(table.id, r.id), sql`${table.headerImage}->>'url' = ${image.url}`));
      checked += 1;
      if (found) withText += 1;
    }
  }
  return { checked, withText };
}
