import { SiteHeader } from '@/components/site/site-header';

/** The public site: what visitors see. No sign-in, no editing. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-harbour">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-harbour/10 bg-white text-sm text-stone-500">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/visitor-logo-grey.svg" alt="Visitor" width={95} height={24} className="h-6 w-auto" />
            <p>Published by Factory with Visit Jersey.</p>
          </div>
          <p>Check with the organiser before you travel.</p>
        </div>
      </footer>
    </div>
  );
}
