import type { Metadata } from 'next';
import Link from 'next/link';
import { ClaimForm } from '@/components/site/claim-form';
import { KIND_PATH } from '@/lib/account-paths';
import { searchClaimable } from '@/lib/claims';
import { one, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'List your venue, event or tour',
  description: 'Run a venue, an event or a tour in Jersey? Claim your listing or add your own, free.',
};

const KIND_LABEL = { venue: 'Venue', event: 'Event', experience: 'Tour' } as const;

/**
 * For venues, organisers and tour operators: find a listing we already
 * have and claim it, or ask to list something we do not.
 */
export default async function ListPage({ searchParams }: { searchParams: SearchParams }) {
  const q = one((await searchParams).q)?.trim() ?? '';
  const found = q ? await searchClaimable(q) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">For venues, organisers and tour operators</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink md:text-4xl">Get your listings on Visitor</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-harbour/80">
        Listing is free. Claim your venue, event or tour and you can keep its details right, add new events and dates as you plan them, and give
        your team access. We check everything before it goes live.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">1. Find your listing</h2>
        <p className="mt-1 text-sm text-harbour/70">We may already list you: we gather events from Visit Jersey, the theatres, Eventbrite and the charities&apos; diary.</p>
        <form className="mt-4 flex max-w-xl gap-2" action="/list">
          <input
            name="q"
            defaultValue={q}
            placeholder="Your venue, event or tour"
            aria-label="Search listings"
            className="w-full rounded-md border border-harbour/20 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/20"
          />
          <button className="rounded bg-harbour px-4 py-2 text-sm font-semibold text-white hover:bg-brand">Search</button>
        </form>

        {q && (
          <div className="mt-4">
            {found.length === 0 ? (
              <p className="text-sm text-harbour/70">Nothing called &ldquo;{q}&rdquo; yet. Tell us about it below.</p>
            ) : (
              <ul className="divide-y divide-harbour/10 rounded-lg ring-1 ring-harbour/10">
                {found.map((l) => (
                  <li key={`${l.kind}-${l.id}`} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{l.title}</p>
                      <p className="text-xs text-harbour/60">
                        {KIND_LABEL[l.kind]}
                        {l.where && ` · ${l.where}`}
                        {l.businessId && ' · already claimed'}
                      </p>
                    </div>
                    <Link href={`/claim/${KIND_PATH[l.kind]}/${l.slug}`} className="shrink-0 rounded border border-harbour/20 px-3 py-1.5 text-sm font-medium hover:border-brand hover:text-brand">
                      Claim
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold text-ink">2. Not listed yet? Tell us about you</h2>
        <p className="mt-1 text-sm text-harbour/70">We will set up your account so you can add your venue, events and tours yourself.</p>
        <div className="mt-6">
          <ClaimForm submitLabel="Ask for an account" />
        </div>
      </section>

      <p className="mt-10 text-sm text-harbour/60">
        Already have an account? <Link href="/login?next=/account" className="text-sea hover:text-brand">Sign in</Link>.
      </p>
    </div>
  );
}
