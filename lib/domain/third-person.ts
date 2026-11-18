import { createHash } from 'node:crypto';
import { decodeEntities, htmlToText } from '@/lib/integrations/jersey-com/parse';

/**
 * Visit Jersey's short descriptions in the third person
 * (lib/integrations/claude/third-person.ts does the edit): which need it,
 * whether an edit changed only that, and the words to print. The edit is
 * kept with their record under _third, keyed to the words it was made
 * from, so it is made once and again only when they change their text.
 */

const BRIEF = 'third-person-1';
export const thirdKey = (original: string) => createHash('sha1').update(`${BRIEF}\u0000${original}`).digest('hex');
export type Third = { key: string; text: string };

/** "We", "our", "us", "I", "my" and their forms, as words: what makes a description first person. */
const FIRST_PERSON = /\b(?:we|we['’](?:re|ve|ll|d)|our|ours|ourselves|us|my|me)\b/i;
/** "I" only as a capital: "i" is no one. */
const I = /\bI(?:['’](?:m|ve|ll|d))?\b/;
export const needsThird = (text: string) => {
  const t = text.replace(/\bU\.?S\.?A?\b/g, '');
  return FIRST_PERSON.test(t) || I.test(t);
};

const words = (t: string) => t.toLowerCase().replace(/[’']/g, "'").match(/[\p{L}\p{N}']+/gu) ?? ([] as string[]);
const PERSON = new Set(['we', "we're", "we've", "we'll", "we'd", 'our', 'ours', 'ourselves', 'us', 'i', "i'm", "i've", 'my', 'me', 'join']);

/**
 * The same description but for its person: every word of the original that
 * is not a first-person word is still there, in order, and the new words
 * are few (the organiser's name, a verb's ending). Otherwise it is a
 * rewrite, and the original stands.
 */
export function sameButForPerson(original: string, edited: string): boolean {
  const a = words(original).filter((w) => !PERSON.has(w));
  const b = words(edited);
  let j = 0;
  let kept = 0;
  for (const w of a) {
    const at = b.indexOf(w, j);
    if (at >= 0) {
      kept += 1;
      j = at + 1;
    }
  }
  const added = b.length - kept;
  const firstPersonWords = words(original).filter((w) => PERSON.has(w)).length;
  // A verb may change with each person (we are → the team is), and no more.
  return kept >= a.length - firstPersonWords && added <= firstPersonWords * 4 + 3 && Math.abs(edited.length - original.length) <= Math.max(40, original.length * 0.25);
}

type Payload = { title?: { rendered?: unknown }; acf?: { title?: unknown; short_description?: unknown; display_name?: unknown; portal_post_owner_name?: unknown }; _third?: Third };
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? decodeEntities(v.trim()) : null);

/** From a record: their short description as words, who wrote it, its title, and the third-person copy kept for it. */
export function recordWords(payload: unknown) {
  const p = payload as Payload | null;
  return {
    text: htmlToText(p?.acf?.short_description),
    organiser: str(p?.acf?.display_name) ?? str(p?.acf?.portal_post_owner_name),
    title: str(p?.acf?.title) ?? str(p?.title?.rendered) ?? '',
    third: p?._third ?? null,
  };
}

/** Their short description as printed: in the third person when it was in the first and the edit passed, else as they wrote it. */
export function printedWords(payload: unknown): string | null {
  const { text, third } = recordWords(payload);
  if (!text) return null;
  return third && third.key === thirdKey(text) ? third.text : text;
}
