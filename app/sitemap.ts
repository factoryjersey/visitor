import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/agents/data';
import { publicEvents, publicOrganisers, publicTours, publicVenuesWithEvents } from '@/lib/db/public';

export const dynamic = 'force-dynamic';

/** Every public page: the sections, then each event, tour, venue and organiser still on. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, tours, venues, organisers] = await Promise.all([
    publicEvents({ showOngoing: true }),
    publicTours({ showOnDemand: true }),
    publicVenuesWithEvents({ withOngoing: true }),
    publicOrganisers(),
  ]);
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/whats-on`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/tours`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/venues`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE}/organisers`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE}/list`, changeFrequency: 'monthly', priority: 0.3 },
    ...events.map(({ event: e }) => ({ url: `${SITE}/whats-on/${e.slug}`, lastModified: e.updatedAt, changeFrequency: 'daily' as const, priority: 0.7 })),
    ...tours.map(({ tour: t }) => ({ url: `${SITE}/tours/${t.slug}`, lastModified: t.updatedAt, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...venues.map((v) => ({ url: `${SITE}/venues/${v.slug}`, changeFrequency: 'weekly' as const, priority: 0.5 })),
    ...organisers.map((o) => ({ url: `${SITE}/organisers/${o.slug}`, changeFrequency: 'weekly' as const, priority: 0.4 })),
  ];
}
