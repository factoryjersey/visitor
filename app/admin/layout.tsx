import type { Metadata } from 'next';
import Link from 'next/link';
import { getUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Visitor Guide admin', robots: { index: false } };

const NAV = [
  { href: '/admin/whats-on', label: "What's on" },
  { href: '/admin/tours', label: 'Tours' },
  { href: '/admin/venues', label: 'Venues' },
  { href: '/admin/guide', label: 'Guide' },
  { href: '/admin/map', label: 'Map' },
];

/** The editing side. Middleware keeps everything under /admin behind sign-in. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="no-print border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link href="/admin" className="font-serif text-lg font-semibold">Visitor Guide</Link>
          {user && (
            <>
              <nav className="flex gap-4 text-sm">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="text-stone-600 hover:text-stone-900">{n.label}</Link>
                ))}
                <Link href="/" className="text-stone-400 hover:text-stone-900">Public site ↗</Link>
              </nav>
              <form action="/logout" method="post" className="ml-auto flex items-center gap-3 text-sm text-stone-500">
                <span>{user.email}</span>
                <button type="submit" className="hover:text-stone-900 hover:underline">Sign out</button>
              </form>
            </>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
