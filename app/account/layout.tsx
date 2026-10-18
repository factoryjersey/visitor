import type { Metadata } from 'next';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { isStaff } from '@/lib/auth/roles';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { businesses } from '@/lib/db/schema';

export const metadata: Metadata = { title: 'Your listings · Visitor Guide', robots: { index: false } };

/** A provider's side: their business's listings and its team. Staff only come here for their password. */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [business] = user.businessId ? await db.select({ name: businesses.name }).from(businesses).where(eq(businesses.id, user.businessId)) : [];
  const nav = isStaff(user.role)
    ? [{ href: '/admin', label: '← Admin' }, { href: '/account/password', label: 'Password' }]
    : [
        { href: '/account', label: 'Listings' },
        { href: '/account/team', label: 'Team' },
        { href: '/account/password', label: 'Password' },
      ];
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href={isStaff(user.role) ? '/admin' : '/account'} className="font-display text-lg font-semibold">
            Visitor Guide{business && <span className="font-sans text-sm font-normal text-stone-500"> · {business.name}</span>}
          </Link>
          <nav className="flex gap-4 text-sm">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="text-stone-600 hover:text-stone-900">{n.label}</Link>
            ))}
          </nav>
          <form action="/logout" method="post" className="ml-auto flex items-center gap-3 text-sm text-stone-500">
            <span className="hidden sm:inline">{user.email}</span>
            <button type="submit" className="hover:text-stone-900 hover:underline">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
