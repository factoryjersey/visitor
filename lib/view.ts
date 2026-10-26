/**
 * How a listing lays out its cards (components/site/view-switch.tsx): one
 * column on a phone, two small ones side by side, or a list. Kept apart
 * from the client component so server pages can read the cookie and use
 * the grid's classes.
 */
export const VIEWS = ['one', 'two', 'list'] as const;
export type View = (typeof VIEWS)[number];
export const asView = (v: string | undefined): View => ((VIEWS as readonly string[]).includes(v ?? '') ? (v as View) : 'one');

/**
 * The grid a listing's cards sit in, for each view. The group-data classes
 * outweigh the plain breakpoints by specificity, so a view wins at every width.
 */
export const CARD_GRID = [
  'grid gap-6 sm:grid-cols-2 lg:grid-cols-3',
  'group-data-[view=two]/view:grid-cols-2 group-data-[view=two]/view:gap-3 sm:group-data-[view=two]/view:grid-cols-3 sm:group-data-[view=two]/view:gap-4 lg:group-data-[view=two]/view:grid-cols-4',
  'group-data-[view=list]/view:grid-cols-1 group-data-[view=list]/view:gap-3 md:group-data-[view=list]/view:grid-cols-2',
].join(' ');
