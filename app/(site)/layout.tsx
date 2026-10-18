import Link from 'next/link';

/** The public site: what visitors see. No sign-in, no editing. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-sand text-harbour">
      <header className="border-b border-harbour/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-4">
          <Link href="/" aria-label="Visitor Guide, Jersey's official visitor guide: home">
            {/* The guide's own wordmark, from visitorguide_logow.eps. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/visitorguide-logo.svg" alt="Visitor Guide: Jersey's official visitor guide" width={180} height={42} className="h-10 w-auto md:h-11" />
          </Link>
          <nav className="flex gap-6 text-sm font-medium">
            <Link href="/whats-on" className="hover:text-coral">What&apos;s on</Link>
            <Link href="/tours" className="hover:text-coral">Tours &amp; experiences</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 bg-harbour text-sm text-white/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/visitorguide-logo-white.svg" alt="Visitor Guide" width={120} height={28} className="h-7 w-auto opacity-90" />
            <p>Published by Factory with Visit Jersey.</p>
          </div>
          <p>Listings from <a href="https://www.jersey.com" className="underline hover:text-white">jersey.com</a>. Check with the organiser before you travel.</p>
        </div>
      </footer>
    </div>
  );
}
