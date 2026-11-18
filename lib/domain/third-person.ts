import { createHash } from 'node:crypto';
import { decodeEntities, htmlToText } from '@/lib/integrations/jersey-com/parse';

/**
 * Visit Jersey's short descriptions as the guide prints them
 * (lib/integrations/claude/third-person.ts does the edit): their short
 * description whole, in the third person where it was in the first; and a
 * longer version for the grid of six, the same with a sentence or two more
 * from their long description after it, so the box is full and nothing
 * they put in the short one is lost. Here: which need what, whether an
 * edit is fit to print, and the words to print. The edit is kept with
 * their record under _third, keyed to the words it was made from, so it
 * is made once and again only when they change their text.
 */

const BRIEF = 'third-person-2';
export const thirdKey = (short: string, long: string | null = null) => createHash('sha1').update(`${BRIEF}\u0000${short}\u0000${long ?? ''}`).digest('hex');
/** text: the short description in the third person; more: what follows it in the longer version, from the long description ('' for none). */
export type Third = { key: string; text: string; more?: string };

/** Characters of copy a box on the grid of six holds at 7pt (copyBudget): what the longer version fills, less a margin. */
export const ROOM = { events: 330, 'tours-and-activities': 440 } as const;
export type TheirType = keyof typeof ROOM;

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

type Payload = { title?: { rendered?: unknown }; acf?: { title?: unknown; short_description?: unknown; long_description?: unknown; display_name?: unknown; portal_post_owner_name?: unknown }; _third?: Third };
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? decodeEntities(v.trim()) : null);

/**
 * What follows the short description is theirs too: nearly every word of
 * it is in their long description (allowing the organiser's name and a
 * changed person), and the whole stays within the box.
 */
export function fromTheirLong(more: string, long: string, organiser: string | null, room: number, short: string): boolean {
  if (!more) return true;
  if (short.length + 1 + more.length > room + 30) return false;
  const have = new Set([...words(long), ...words(organiser ?? ''), ...words(short), ...['they', 'their', 'theirs', 'them', 'is', 'are', 'has', 'have', 'the', 'team', 'organisers']]);
  const added = words(more);
  const strange = added.filter((w) => !have.has(w));
  return strange.length <= Math.max(1, Math.floor(added.length * 0.08));
}

/** From a record: their short and long descriptions as words, who wrote it, its title, and the copy kept for it. */
export function recordWords(payload: unknown) {
  const p = payload as Payload | null;
  return {
    long: htmlToText(p?.acf?.long_description),
    text: htmlToText(p?.acf?.short_description),
    organiser: str(p?.acf?.display_name) ?? str(p?.acf?.portal_post_owner_name),
    title: str(p?.acf?.title) ?? str(p?.title?.rendered) ?? '',
    third: p?._third ?? null,
  };
}

/**
 * Their words as printed: the short description, in the third person when
 * it was in the first and the edit passed, else as they wrote it; and the
 * longer version, when there is one, for the boxes with room.
 */
export function printedWords(payload: unknown): { short: string; longer: string | null } | null {
  const { text, long, third } = recordWords(payload);
  if (!text) return null;
  if (!third || third.key !== thirdKey(text, long)) return { short: text, longer: null };
  return { short: third.text, longer: third.more ? `${third.text} ${third.more}` : null };
}

/** Whether a record has anything for the edit to do: a first person to change, or a long description with more to tell. */
export const wantsEdit = (text: string, long: string | null) => needsThird(text) || (!!long && long.length > text.length + 40);
