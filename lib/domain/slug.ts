/** "Gardener's Rest — St Aubin" to "gardeners-rest-st-aubin". */
export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['‘’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'place';
}

/** The first of `base`, `base-<qualifier>`, `base-2`… not already taken. */
export function uniqueSlug(base: string, taken: (s: string) => boolean, qualifier?: string | null): string {
  const root = slugify(base);
  if (!taken(root)) return root;
  if (qualifier) {
    const q = `${root}-${slugify(qualifier)}`;
    if (!taken(q)) return q;
  }
  for (let n = 2; ; n += 1) {
    if (!taken(`${root}-${n}`)) return `${root}-${n}`;
  }
}
