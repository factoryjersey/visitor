import type { Metadata } from 'next';
import Link from 'next/link';
import { leaveAction } from '@/app/(site)/subscribe/actions';
import { subscriberByToken } from '@/lib/subscribers';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false } };

/**
 * The unsubscribe link in every weekly email. A button, not the link
 * itself: mail systems open every link in an email to check it, and that
 * must not take anybody off the list. Mail apps' own unsubscribe button
 * uses /api/unsubscribe instead, which needs no click.
 */
export default async function LeavePage({ params }: { params: Promise<{ token: string }> }) {
  const token = decodeURIComponent((await params).token);
  const found = await subscriberByToken(token);

  if (!found) {
    return (
      <Frame heading="That link does not work">
        <p className="mt-3 leading-relaxed text-harbour/80">It may have been copied only in part. Use the link at the bottom of any weekly email, or reply to one and we will take you off.</p>
      </Frame>
    );
  }

  if (found.status === 'unsubscribed') {
    return (
      <Frame heading="You’re off the list">
        <p className="mt-3 leading-relaxed text-harbour/80">
          We will not send the weekly email to {found.email} again. Changed your mind?{' '}
          <Link href="/subscribe" className="font-medium text-sea hover:text-brand">
            Sign up again
          </Link>
          .
        </p>
      </Frame>
    );
  }

  return (
    <Frame heading="Leave the weekly email?">
      <p className="mt-3 leading-relaxed text-harbour/80">We will stop sending What’s On to {found.email}.</p>
      <form action={leaveAction} className="mt-8">
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-harbour">
          Unsubscribe
        </button>
      </form>
    </Frame>
  );
}

function Frame({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-ink">{heading}</h1>
      {children}
    </div>
  );
}
