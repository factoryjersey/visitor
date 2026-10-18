import Link from 'next/link';

/** The public site: what visitors see. No sign-in, no editing. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-sand text-harbour">
      <header className="border-b border-harbour/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-4">
          <Link href="/" className="leading-none">
            <span className="block font-serif text-2xl font-bold tracking-tight">Jersey</span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-sea">Visitor Guide</span>
          </Link>
          <nav className="flex gap-6 text-sm font-medium">
            <Link href="/whats-on" className="hover:text-coral">What&apos;s on</Link>
            <Link href="/tours" className="hover:text-coral">Tours &amp; experiences</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 bg-harbour text-sm text-white/70">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-8">
          <p>The official Jersey visitor guide, published by Factory with Visit Jersey.</p>
          <p>Listings from <a href="https://www.jersey.com" className="underline hover:text-white">jersey.com</a>. Check with the organiser before you travel.</p>
        </div>
      </footer>
    </div>
  );
}
