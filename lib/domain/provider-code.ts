/**
 * A provider's key code in the guide: the initials of its name, as the
 * 2026 editions' key has them (Valley Adventure Centre, VAC). Small words
 * and joining marks are left out; a one-word name takes its first two
 * letters. If the code is taken, the first word gives up another letter
 * at a time (ROAC), then a number. Never more than five characters.
 */
const SMALL = new Set(['the', 'and', 'x', 'with', 'in', 'of', 'at', 'by', 'for', 'a', 'an', 'on']);

export function providerCode(name: string, taken: Set<string>): string {
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w && !SMALL.has(w.toLowerCase()))
    .map((w) => w.toUpperCase());
  if (!words.length) return free('P', taken);
  const rest = words.slice(1, 4).map((w) => w[0]).join('');
  const first = words[0]!;
  for (let n = words.length === 1 ? 2 : 1; n <= first.length; n += 1) {
    const code = `${first.slice(0, n)}${rest}`.slice(0, 5);
    if (code.length >= 2 && !taken.has(code)) return code;
  }
  return free(`${first[0]}${rest}`.slice(0, 4), taken);
}

function free(stem: string, taken: Set<string>): string {
  for (let i = 2; ; i += 1) if (!taken.has(`${stem}${i}`)) return `${stem}${i}`;
}

/** Codes for every provider that has none, alongside the ones that have. */
export function fillCodes<T extends { id: string; name: string; code: string | null }>(providers: T[]): Map<string, string> {
  const taken = new Set(providers.map((p) => p.code).filter((c): c is string => !!c));
  const out = new Map<string, string>();
  for (const p of [...providers].sort((a, b) => a.name.localeCompare(b.name))) {
    if (p.code) continue;
    const code = providerCode(p.name, taken);
    taken.add(code);
    out.set(p.id, code);
  }
  return out;
}
