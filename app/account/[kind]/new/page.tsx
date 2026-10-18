import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireProvider } from '@/lib/auth/session';
import { JERSEY_PARISHES, kindFromPath } from '@/lib/account-paths';
import { ListingForm } from '@/components/account/listing-form';
import { formOptions } from '@/components/account/form-setup';

export const dynamic = 'force-dynamic';

const TITLE = { venue: 'Add a venue', event: 'Add an event', experience: 'Add a tour or experience' } as const;

export default async function NewListingPage({ params }: { params: Promise<{ kind: string }> }) {
  const kind = kindFromPath((await params).kind);
  if (!kind) notFound();
  const user = await requireProvider();
  const options = await formOptions(kind, user.businessId);
  return (
    <div className="space-y-4">
      <Link href="/account" className="text-sm text-stone-500 hover:underline">← Your listings</Link>
      <h1 className="font-serif text-3xl">{TITLE[kind]}</h1>
      <p className="max-w-2xl text-sm text-stone-600">We check every new listing before it goes on the site. You can keep editing it until then.</p>
      <ListingForm kind={kind} defaults={kind === 'venue' ? { category: 'see' } : {}} options={options} parishes={JERSEY_PARISHES} submitLabel="Send for review" />
    </div>
  );
}
