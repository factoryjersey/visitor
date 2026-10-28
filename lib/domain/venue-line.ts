/** A venue's one line, for its box in the guide: one finished sentence, short enough for the box. */
export const VENUE_LINE_MAX = 110;

/** A line over the limit by more than a word's slack, or one that trails off or never ends, is no use to the box. */
export const usableLine = (l: string) => l.length > 0 && l.length <= VENUE_LINE_MAX + 12 && !/(\.\.|…)/.test(l) && /[.?]$/.test(l);
