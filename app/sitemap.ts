import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/agents/data';
import { publicEventMonths, publicEvents, publicOrganisers, publicTours, publicVenuesWithEvents } from '@/lib/db/public';
import { monthPath } from '@/lib/domain/months';

export const dynamic = 'force-dynamic';

/** Every public page: the sections and What's on's month pages, then each event, tour, venue and organiser still on. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, tours, venues, organisers, months] = await Promise.all([
    publicEvents({ showOngoing: true }),
    publicTours({ showOnDemand: true }),
    publicVenuesWithEvents({ withOngoing: true }),
    publicOrganisers(),
    publicEventMonths(),
  ]);
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/whats-on`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...months.map(({ ym }) => ({ url: `${SITE}${monthPath(ym)}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.8 })),
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
