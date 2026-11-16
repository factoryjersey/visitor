import { PAGE_SWATCHES } from '@/lib/domain/guide-colours';

/**
 * The guide's sections that are not venue sections, by the names their
 * tabs print: shared by the book (a client component) and the proof page
 * (a server one), so the proof's PDF buttons can name them.
 */
export type Section = { name: string; colour: string };
export const EVENTS: Section = { name: 'Events this season', colour: PAGE_SWATCHES.events.hex };
export const TOURS: Section = { name: 'Tours and experiences', colour: PAGE_SWATCHES.tours.hex };
export const NEW: Section = { name: 'New this season', colour: PAGE_SWATCHES.new.hex };
