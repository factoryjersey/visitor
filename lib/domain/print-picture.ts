import { normaliseName } from './same-place';

/**
 * Which venue a picture from the printed guide's InDesign links shows,
 * read from its file name: "cristina sunset hero.jpg" is Hotel Cristina,
 * "129926129997_atlantic.jpg" (a Visit Jersey download, its numbers
 * first) is The Atlantic Hotel. Every telling word of the venue's name
 * must be in the file's; when more than one venue qualifies, the one
 * with the most such words wins, then the one more of whose whole name
 * is there ("jersey pearl" is Jersey Pearl, not Jersey Pearl Café), and
 * an even tie is left for a person.
 */
export type Named = { id: string; name: string };

/** Words that say what a place is, not which, and the litter of file names. */
const NOISE = new Set([
  'and', 'of', 'at', 'the', 'by', 'in', 'on', 'jersey', 'st', 'saint', 'hotel', 'restaurant', 'bar', 'cafe', 'ltd', 'limited', 'channel', 'islands',
  'vjvg', 'vjvm', 'vj', 'visit', 'whats', 'whatson', 'sq', 'fp', 'dps', 'hero', 'thumb', 'view', 'web', 'lr', 'img', 'image', 'dji', 'screenshot', 'copy',
  'final', 'print', 'jpg', 'jpeg', 'png', 'psd', 'tif', 'tiff', 'webp', 'scaled', 'unnamed', 'default', 'main', 'pic', 'photo', 'banner', 'logo',
]);

const telling = (s: string) => normaliseName(s).split(' ').filter((w) => w.length > 1 && !NOISE.has(w) && !/^\d+$/.test(w));

const stem = (filename: string) => filename.replace(/\.[a-z0-9]+$/i, '').replace(/^\d{5,}_/, '').replace(/[_\-.#()]+/g, ' ');

/** The words of a file name, without its extension, its Visit Jersey numbers or its edition. */
export function fileWords(filename: string): Set<string> {
  return new Set(telling(stem(filename)));
}

export type PictureMatch<T extends Named> = { venue: T | null; tied: T[] };

export function matchPicture<T extends Named>(filename: string, venues: T[]): PictureMatch<T> {
  const words = fileWords(filename);
  if (!words.size) return { venue: null, tied: [] };
  const every = new Set(normaliseName(stem(filename)).split(' '));
  const fits = venues
    .map((v) => {
      const need = [...new Set(telling(v.name))];
      const all = normaliseName(v.name).split(' ');
      return { v, need, whole: all.filter((w) => every.has(w)).length / all.length };
    })
    .filter((x) => x.need.length > 0 && x.need.every((w) => words.has(w)))
    .sort((a, b) => b.need.length - a.need.length || b.whole - a.whole);
  const top = fits[0];
  if (!top) return { venue: null, tied: [] };
  const best = fits.filter((x) => x.need.length === top.need.length && x.whole === top.whole).map((x) => x.v);
  return best.length === 1 ? { venue: top.v, tied: [] } : { venue: null, tied: best };
}
