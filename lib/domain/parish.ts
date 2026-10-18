/** "St. Saviour", "Saint Saviour" and "St Saviour" are one parish. */
export function tidyParish(label: string): string {
  return label.replace(/^(St\.|Saint)\s+/i, 'St ').replace(/\s+/g, ' ').trim();
}
