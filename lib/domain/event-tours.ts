/**
 * Tours listed as events. A guide who sells walks on Eventbrite lists
 * them there as events ("Stroll In Jersey Twilight Walk St. Peter Route
 * 2"), and they reached What's On; the editor moved them to Tours &
 * Experiences ("doesn't belong here, it is a tour"). An event whose title
 * opens with the name of a provider who has tours in the guide is one of
 * theirs: it prints with the tours, under that provider's marker, and not
 * at all when the provider's own tour that day is printed already.
 */

const words = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** The provider whose name opens the title, by its name or one of its other names; none for a name too short to tell (one word). */
export function tourProviderOf<P extends { name: string; aliases?: string[] }>(title: string, providers: readonly P[]): P | null {
  const t = `${words(title)} `;
  for (const p of providers) {
    for (const name of [p.name, ...(p.aliases ?? [])]) {
      const n = words(name);
      if (n.split(' ').length >= 2 && t.startsWith(`${n} `) && t.length > n.length + 1) return p;
    }
  }
  return null;
}

/** The title without the provider's name in front: "Twilight Walk St. Peter Route 2". */
export function asTourTitle(title: string, provider: { name: string; aliases?: string[] }): string {
  for (const name of [provider.name, ...(provider.aliases ?? [])]) {
    const n = words(name).split(' ');
    // As many words off the front as the name has, if they are its words.
    const parts = title.trim().split(/\s+/);
    if (words(parts.slice(0, n.length).join(' ')) === n.join(' ') && parts.length > n.length) return parts.slice(n.length).join(' ').replace(/^[-–:|]\s*/, '');
  }
  return title;
}
