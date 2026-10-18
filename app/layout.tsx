import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Visitor Guide',
  description: "What's on and venues for the official Jersey visitor guide",
};

const NAV = [
  { href: '/whats-on', label: "What's on" },
  { href: '/venues', label: 'Venues' },
  { href: '/guide', label: 'Guide' },
  { href: '/map', label: 'Map' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <header className="no-print border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-serif text-lg font-semibold">Visitor Guide</Link>
            <nav className="flex gap-4 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-stone-600 hover:text-stone-900">{n.label}</Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
