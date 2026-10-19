import { asc } from 'drizzle-orm';
import Link from 'next/link';
import { ClaimDecision } from '@/components/admin-claim-decision';
import { requireStaff } from '@/lib/auth/session';
import { claimQueue } from '@/lib/claims';
import { db } from '@/lib/db';
import { businesses, type ListingKind } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

const KIND: Record<ListingKind, { label: string; admin: string; site: string | null }> = {
  venue: { label: 'Venue', admin: '/admin/venues', site: null },
  event: { label: 'Event', admin: '/admin/whats-on', site: '/whats-on' },
  experience: { label: 'Tour', admin: '/admin/tours', site: '/tours' },
};

const when = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Jersey' });

/** Venues, organisers and operators asking for their listings, or for an account, from /list and the claim links. */
export default async function ClaimsPage() {
  await requireStaff();
  const [queue, all] = await Promise.all([claimQueue(), db.select({ id: businesses.id, name: businesses.name }).from(businesses).orderBy(asc(businesses.name))]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Claims</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          People saying a listing is theirs, or asking to list something new. Check they run it (their email&apos;s domain, a call to the number
          on the listing) before approving: approving gives them the listing and an invite to sign in.
        </p>
      </div>

      {queue.length === 0 && <p className="rounded-lg bg-white p-6 text-sm text-stone-500 ring-1 ring-stone-200">Nothing waiting.</p>}

      <ul className="space-y-4">
        {queue.map((c) => (
          <li key={c.id} className="grid gap-6 rounded-lg bg-white p-5 ring-1 ring-stone-200 md:grid-cols-[1fr_360px]">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  {c.kind ? `Claims a ${KIND[c.kind].label.toLowerCase()}` : 'Asks for an account'} · {when.format(c.createdAt)}
                </p>
                {c.kind && c.listing ? (
                  <p className="mt-1 text-base font-semibold">
                    <Link href={`${KIND[c.kind].admin}/${c.listing.slug}`} className="hover:underline">{c.listing.title}</Link>
                    {KIND[c.kind].site && (
                      <Link href={`${KIND[c.kind].site}/${c.listing.slug}`} className="ml-2 text-xs font-normal text-stone-500 hover:underline">on the site ↗</Link>
                    )}
                  </p>
                ) : (
                  <p className="mt-1 text-base font-semibold">{c.businessName}</p>
                )}
                {c.listing?.businessName && <p className="mt-1 text-amber-800">Already with {c.listing.businessName}: approving moves it.</p>}
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-stone-500">Who</dt>
                <dd>{c.name}{c.relationship && <span className="text-stone-500"> · {c.relationship}</span>}</dd>
                <dt className="text-stone-500">Email</dt>
                <dd><a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a></dd>
                {c.phone && (<><dt className="text-stone-500">Phone</dt><dd><a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className="hover:underline">{c.phone}</a></dd></>)}
                <dt className="text-stone-500">Business</dt>
                <dd>{c.businessName}</dd>
                {c.account?.role === 'provider' && (<><dt className="text-stone-500">Account</dt><dd>Already a provider{c.account.businessName && ` for ${c.account.businessName}`}</dd></>)}
              </dl>
              {c.message && <p className="whitespace-pre-line rounded bg-stone-50 p-3 text-stone-700">{c.message}</p>}
              {c.account && c.account.role !== 'provider' && (
                <p className="rounded bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200">
                  {c.email} is a staff account here, so it cannot be given a business. Turn this down and claim again with another address, or give the
                  listing to a business from its admin page.
                </p>
              )}
            </div>
            <ClaimDecision
              claimId={c.id}
              email={c.email}
              isVenue={c.kind === 'venue'}
              businessName={c.businessName}
              accountBusiness={c.account?.businessId && c.account.businessName ? { id: c.account.businessId, name: c.account.businessName } : null}
              suggestions={c.suggestions}
              businesses={all}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
