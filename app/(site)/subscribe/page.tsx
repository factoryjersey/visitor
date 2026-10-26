import type { Metadata } from 'next';
import { SubscribeForm } from '@/components/site/subscribe-form';

export const metadata: Metadata = {
  title: 'The weekly What’s On email',
  description: 'What’s on in Jersey in the coming week, in your inbox every Thursday morning. Free.',
  alternates: { canonical: '/subscribe' },
};

/** Signing up for the weekly email, for anyone who closed the front page's popover or comes from the footer. */
export default function SubscribePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Every Thursday morning</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink md:text-4xl">The weekly What’s On email</h1>
      <p className="mt-3 leading-relaxed text-harbour/80">
        What’s on in Jersey in the week ahead, from the big nights to the small ones: shows, gigs, festivals, matches, markets and things to
        do with the family. Free, one email a week.
      </p>
      <div className="mt-8">
        <SubscribeForm source="page" />
      </div>
    </div>
  );
}
