import Link from 'next/link';
import { requireProvider } from '@/lib/auth/session';
import { KIND_PATH } from '@/lib/account-paths';
import type { ListingKind, Review } from '@/lib/db/schema';
import { eventDatesText } from '@/lib/domain/format';
import { businessListings } from '@/lib/listings';
import { ReviewBadge } from '@/components/account/review-badge';

export const dynamic = 'force-dynamic';

type Item = { id: string; slug: string; label: string; detail: string | null; review: Review; changeWaiting: boolean };

export default async function AccountHome() {
  const user = await requireProvider();
  const { venues, events, experiences } = await businessListings(user.businessId);

  const sections: { kind: ListingKind; title: string; add: string; items: Item[] }[] = [
    {
      kind: 'venue',
      title: 'Venues',
      add: 'Add a venue',
      items: venues.map(({ row, changeWaiting }) => ({ id: row.id, slug: row.slug, label: row.name, detail: row.parish, review: row.review, changeWaiting })),
    },
    {
      kind: 'event',
      title: 'Events',
      add: 'Add an event',
      items: events.map(({ row, changeWaiting }) => ({ id: row.id, slug: row.slug, label: row.title, detail: eventDatesText(row.dates), review: row.review, changeWaiting })),
    },
    {
      kind: 'experience',
      title: 'Tours & experiences',
      add: 'Add a tour',
      items: experiences.map(({ row, changeWaiting }) => ({ id: row.id, slug: row.slug, label: row.title, detail: row.duration, review: row.review, changeWaiting })),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Your listings</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          New listings and changes to live ones are checked by the Visitor Guide team before they appear. Being listed online does not by itself put you in the printed guide.
        </p>
      </div>
      {sections.map((s) => (
        <section key={s.kind}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <h2 className="font-serif text-xl">{s.title}</h2>
            <Link href={`/account/${KIND_PATH[s.kind]}/new`} className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-100">{s.add}</Link>
          </div>
          {s.items.length ? (
            <ul className="divide-y divide-stone-200 rounded border border-stone-200 bg-white text-sm">
              {s.items.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <Link href={`/account/${KIND_PATH[s.kind]}/${i.slug}`} className="font-medium hover:underline">{i.label}</Link>
                    {i.detail && <div className="text-stone-500">{i.detail}</div>}
                  </div>
                  <ReviewBadge review={i.review} changeWaiting={i.changeWaiting} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded border border-dashed border-stone-300 p-3 text-sm text-stone-500">None yet.</p>
          )}
        </section>
      ))}
    </div>
  );
}
