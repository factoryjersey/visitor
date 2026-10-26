/** "St. Saviour", "Saint Saviour" and "St Saviour" are one parish. */
export function tidyParish(label: string): string {
  return label.replace(/^(St\.|Saint)\s+/i, 'St ').replace(/\s+/g, ' ').trim();
}

const PARISHES = ['Grouville', 'St Brelade', 'St Clement', 'St Helier', 'St John', 'St Lawrence', 'St Martin', 'St Mary', 'St Ouen', 'St Peter', 'St Saviour', 'Trinity'];

/** Jèrriais and French names, as ticketing sites give them, to the English the guide prints. */
const FRENCH: Record<string, string> = {
  'saint-pierre': 'St Peter', 'saint-laurent': 'St Lawrence', 'saint-ouen': 'St Ouen', 'saint-brelade': 'St Brelade',
  'saint-clement': 'St Clement', 'saint-helier': 'St Helier', 'saint-sauveur': 'St Saviour', 'saint-jean': 'St John',
  'saint-martin': 'St Martin', 'sainte-marie': 'St Mary', 'la trinite': 'Trinity', 'trinite': 'Trinity',
};

/** One of the twelve parishes, from however a source spells it, or null. "Jersey" and "channel islands" are not parishes. */
export function parishOf(label: string | null | undefined): string | null {
  if (!label) return null;
  const plain = label.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  if (FRENCH[plain]) return FRENCH[plain]!;
  const tidy = tidyParish(label.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/-/g, ' '));
  return PARISHES.find((p) => p.toLowerCase() === tidy.toLowerCase()) ?? null;
}
