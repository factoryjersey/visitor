import type { LucideIcon } from 'lucide-react';
import { GENRE_MARKERS, markersFor } from '@/components/site/category-markers';
import type { Genre } from '@/lib/domain/genre';

/**
 * The website's category icons, printed: up to two on each listing, and a
 * key of those a page uses down its outer edge, under the tabs.
 */
const SHORT: Record<string, string> = {
  'Family friendly': 'Family',
  'Food & drink': 'Food & drink',
  'Arts & cultural': 'Arts',
  'History & Heritage': 'Heritage',
  'Markets & fairs': 'Markets',
  'Talks & learning': 'Talks',
  'Health & wellbeing': 'Wellbeing',
  Festivals: 'Festival',
  Sports: 'Sport',
};
export type Icon = { label: string; Icon: LucideIcon };

export function iconsFor(e: { types?: readonly string[]; genre?: string }): Icon[] {
  if (e.genre && e.genre in GENRE_MARKERS) return [{ label: e.genre, Icon: GENRE_MARKERS[e.genre as Genre] }];
  return markersFor(e.types ?? [], 2).map(([t, Icon]) => ({ label: SHORT[t] ?? t, Icon }));
}

export function ListingIcons({ icons }: { icons: Icon[] }) {
  if (!icons.length) return null;
  return (
    <span className="gp-icons" aria-label={icons.map((i) => i.label).join(', ')}>
      {icons.map(({ label, Icon }) => <Icon key={label} aria-hidden="true" strokeWidth={1.75} />)}
    </span>
  );
}

/** The page's key: each icon it uses once, in the website's order, running down the edge column. */
export function PageKey({ icons, side, below }: { icons: Icon[]; side: 'left' | 'right'; below: 'tab' | 'marker' }) {
  const seen = new Map<string, Icon>();
  for (const i of icons) if (!seen.has(i.label)) seen.set(i.label, i);
  if (!seen.size) return null;
  return (
    <div className={`gp-key gp-${side} gp-below-${below}`}>
      {[...seen.values()].map(({ label, Icon }) => (
        <span key={label}><Icon aria-hidden="true" strokeWidth={1.75} />{label}</span>
      ))}
    </div>
  );
}
