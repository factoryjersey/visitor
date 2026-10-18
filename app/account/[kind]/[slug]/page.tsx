import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireProvider } from '@/lib/auth/session';
import { canEditListing } from '@/lib/auth/roles';
import { JERSEY_PARISHES, kindFromPath } from '@/lib/account-paths';
import { db } from '@/lib/db';
import type { Review } from '@/lib/db/schema';
import { TABLES, lastRejectedChange, openChange, titleOf } from '@/lib/listings';
import { ListingForm } from '@/components/account/listing-form';
import { formDefaults, formOptions } from '@/components/account/form-setup';
import { ReviewBadge } from '@/components/account/review-badge';

export const dynamic = 'force-dynamic';

const PUBLIC_PATH = { venue: null, event: '/whats-on', experience: '/tours' } as const;

export default async function EditListingPage({ params, searchParams }: { params: Promise<{ kind: string; slug: string }>; searchParams: Promise<{ created?: string; rewritten?: string }> }) {
  const { kind: segment, slug } = await params;
  const kind = kindFromPath(segment);
  if (!kind) notFound();
  const user = await requireProvider();
  const table = TABLES[kind];
  const [row] = (await db.select().from(table).where(eq(table.slug, slug))) as (Record<string, unknown> & { id: string; review: Review; reviewNote: string | null; businessId: string | null })[];
  // Somebody else's listing looks the same as no listing.
  if (!row || !canEditListing(user, row)) notFound();

  const [change, rejected, options] = await Promise.all([openChange(kind, row.id), lastRejectedChange(kind, row.id), formOptions(kind, user.businessId)]);
  // Edit the pending version, so a second edit builds on the first rather than losing it.
  const defaults = formDefaults(kind, { ...row, ...(change?.changes ?? {}) });
  const publicPath = PUBLIC_PATH[kind];
  const { created, rewritten } = await searchParams;

  return (
    <div className="space-y-4">
      <Link href="/account" className="text-sm text-stone-500 hover:underline">← Your listings</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-serif text-3xl">{titleOf(row as never)}</h1>
        <ReviewBadge review={row.review} changeWaiting={!!change} />
      </div>

      {created && <Notice tone="ok">Sent. We will check it and it will appear once approved; until then you can keep editing it here.</Notice>}
      {created && rewritten && <Notice>We have put your description in the guide’s voice and written the one-line summary shown on listing cards. Check both below and change anything we got wrong.</Notice>}
      {row.review === 'pending' && !created && <Notice>We have not checked this yet. Edits save straight away.</Notice>}
      {row.review === 'rejected' && (
        <Notice tone="bad">
          We did not accept this listing{row.reviewNote ? <>: “{row.reviewNote}”</> : '.'} Change it and save to send it again.
        </Notice>
      )}
      {row.review === 'approved' && (
        <Notice>
          {change ? 'Your last change is waiting for us to check it; the live listing shows the version before it. ' : 'This listing is live. '}
          Changes you save here are checked before they appear.
          {publicPath && <> <Link href={`${publicPath}/${slug}`} className="underline">See it on the site</Link>.</>}
        </Notice>
      )}
      {row.review === 'approved' && !change && rejected && (
        <Notice tone="bad">We did not accept your last change{rejected.reviewNote ? <>: “{rejected.reviewNote}”</> : '.'}</Notice>
      )}

      <ListingForm
        kind={kind}
        id={row.id}
        defaults={defaults}
        options={options}
        parishes={JERSEY_PARISHES}
        submitLabel={row.review === 'approved' ? 'Send change for review' : 'Save'}
      />
    </div>
  );
}

function Notice({ tone, children }: { tone?: 'ok' | 'bad'; children: React.ReactNode }) {
  const style = tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : tone === 'bad' ? 'border-red-200 bg-red-50 text-red-800' : 'border-stone-200 bg-white text-stone-700';
  return <p className={`max-w-3xl rounded border px-3 py-2 text-sm ${style}`}>{children}</p>;
}
