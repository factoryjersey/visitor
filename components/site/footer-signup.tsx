'use client';

import { usePathname } from 'next/navigation';
import { SubscribeForm } from './subscribe-form';

/**
 * The weekly email at the foot of every page: what it is and the form. Not
 * on /subscribe, whose page is the same form already.
 */
export function FooterSignup() {
  const path = usePathname();
  if (path.startsWith('/subscribe')) return null;
  return (
    <div className="border-b border-harbour/10 bg-harbour/[0.03]">
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-8 md:grid-cols-2 md:items-center md:gap-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Every Thursday morning</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-ink">The weekly What’s On email</h2>
          <p className="mt-1 text-sm leading-relaxed text-harbour/75">The week ahead in Jersey, from the big nights to the small ones. Free.</p>
        </div>
        <SubscribeForm source="footer" />
      </div>
    </div>
  );
}
