import type { Metadata } from 'next';
import Link from 'next/link';
import { confirmSubscription } from '@/lib/subscribers';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Confirm the weekly email', robots: { index: false } };

/** The link in the confirmation email. Opening it is the confirming. */
export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const status = await confirmSubscription(decodeURIComponent((await params).token));

  const [heading, body] =
    status === 'subscribed'
      ? ['You’re on the list', 'The week’s What’s On will be with you every Thursday morning. Every email has a link at the bottom if you ever want to leave.']
      : status === 'unsubscribed'
        ? ['You left the list', 'You unsubscribed from the weekly email, so we have not signed you up again. To come back, sign up once more.']
        : ['That link does not work', 'It may have been copied only in part. Sign up again and we will send you a new one.'];

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-ink">{heading}</h1>
      <p className="mt-3 leading-relaxed text-harbour/80">{body}</p>
      <div className="mt-8 flex flex-wrap gap-4 text-sm font-medium">
        {status !== 'subscribed' && (
          <Link href="/subscribe" className="rounded-md bg-brand px-4 py-2.5 text-white hover:bg-harbour">
            Sign up
          </Link>
        )}
        <Link href="/whats-on?when=week" className="py-2.5 text-sea hover:text-brand">
          See what’s on this week →
        </Link>
      </div>
    </div>
  );
}
