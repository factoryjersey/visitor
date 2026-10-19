import Link from 'next/link';
import { SiteHeader } from '@/components/site/site-header';
import { Wordmark } from '@/components/site/wordmark';

/** The public site: what visitors see. No sign-in, no editing. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-harbour">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-harbour/10 bg-white text-sm text-stone-500">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8">
          <div className="flex items-center gap-4">
            <Wordmark tone="grey" size="footer" />
            <p>Published by Factory with Visit Jersey.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/list" className="font-medium text-harbour hover:text-coral">List your venue, event or tour</Link>
            <p>Check with the organiser before you travel.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
