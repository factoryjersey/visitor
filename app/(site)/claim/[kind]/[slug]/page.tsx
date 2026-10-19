import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClaimForm } from '@/components/site/claim-form';
import { kindFromPath } from '@/lib/account-paths';
import { claimable } from '@/lib/claims';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Claim a listing', robots: { index: false } };

const NOUN = { venue: 'venue', event: 'event', experience: 'tour' } as const;
const PUBLIC_PATH = { venue: null, event: '/whats-on', experience: '/tours' } as const;

type Props = { params: Promise<{ kind: string; slug: string }> };

/** "This is ours": the claim form for one listing, reached from its page. */
export default async function ClaimPage({ params }: Props) {
  const { kind: segment, slug } = await params;
  const kind = kindFromPath(segment);
  const listing = kind ? await claimable(kind, slug) : null;
  if (!kind || !listing) notFound();
  const back = PUBLIC_PATH[kind];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {back && <Link href={`${back}/${listing.slug}`} className="text-sm text-harbour/60 hover:text-brand">← {listing.title}</Link>}
      <h1 className="mt-3 font-display text-3xl font-bold text-ink">Is this your {NOUN[kind]}?</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-harbour/80">
        Claim <strong className="font-semibold text-ink">{listing.title}</strong>
        {listing.where && <span> ({listing.where})</span>} and you can keep its details up to date and add what you have coming up. We check every
        claim before handing a listing over.
      </p>
      {listing.businessId && (
        <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Somebody already looks after this listing. If that is not right, tell us below and we will look into it.
        </p>
      )}
      <div className="mt-8">
        <ClaimForm kind={kind} listingId={listing.id} submitLabel="Send my claim" />
      </div>
      <p className="mt-8 text-sm text-harbour/60">
        Already have an account? <Link href="/login?next=/account" className="text-sea hover:text-brand">Sign in</Link> and add it from your listings.
      </p>
    </div>
  );
}
