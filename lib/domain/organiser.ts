/**
 * One organiser however a source spells them: "The Jersey Arts Centre",
 * "Jersey Arts Centre" and "jersey arts centre" are the same.
 */
export const organiserKey = (s: string) => s.toLowerCase().replace(/&amp;/g, '&').replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '');
