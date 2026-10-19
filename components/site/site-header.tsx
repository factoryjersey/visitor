'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/whats-on', label: 'What’s on' },
  { href: '/tours', label: 'Tours & experiences' },
  { href: '/venues', label: 'Venues' },
  { href: '/organisers', label: 'Organisers' },
];

/**
 * The wordmark with its line beneath, and the menu: along the right on a
 * desktop, behind a burger on tablets and phones that turns into a cross
 * and lets the menu fall open below the bar.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  // Going somewhere closes it; so does Escape.
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const current = (href: string) => path === href || path.startsWith(`${href}/`);

  return (
    <header className="relative z-30 border-b border-harbour/10 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
        <Link href="/" aria-label="Visitor, Jersey’s What’s On Guide: home" className="flex flex-col">
          {/* The visitor wordmark, as on visitor.je, in harbour navy for the white header. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/visitor-logo.svg" alt="Visitor" width={130} height={33} className="h-7 w-auto self-start md:h-8" />
          <span className="mt-1 font-serif text-[0.8rem] italic leading-none text-ink/70">Jersey’s What’s On Guide</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={current(n.href) ? 'page' : undefined}
              className={`font-display text-[0.95rem] font-semibold tracking-wide transition-colors hover:text-coral ${current(n.href) ? 'text-coral' : 'text-ink'}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="group -mr-2 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-harbour/5 lg:hidden"
        >
          <span className="relative block h-3.5 w-6" aria-hidden="true">
            <span className={`absolute left-0 top-0 h-0.5 w-6 rounded-full bg-ink transition-transform duration-300 ease-out ${open ? 'translate-y-[6px] rotate-45' : ''}`} />
            <span className={`absolute left-0 top-[6px] h-0.5 rounded-full bg-ink transition-all duration-300 ease-out ${open ? 'w-0 opacity-0' : 'w-4 group-hover:w-6'}`} />
            <span className={`absolute left-0 top-3 h-0.5 w-6 rounded-full bg-ink transition-transform duration-300 ease-out ${open ? '-translate-y-[6px] -rotate-45' : ''}`} />
          </span>
        </button>
      </div>

      <div
        id="site-menu"
        className={`absolute inset-x-0 top-full overflow-hidden border-b border-harbour/10 bg-white shadow-lg transition-[max-height,opacity] duration-300 ease-out lg:hidden ${open ? 'max-h-80 opacity-100' : 'pointer-events-none max-h-0 opacity-0'}`}
        inert={!open}
      >
        <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-col px-4 py-4">
          {NAV.map((n, i) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={current(n.href) ? 'page' : undefined}
              style={{ transitionDelay: open ? `${80 + i * 60}ms` : '0ms' }}
              className={`border-b border-harbour/10 py-4 font-display text-2xl font-semibold transition-all duration-300 last:border-0 ${open ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'} ${current(n.href) ? 'text-coral' : 'text-ink'}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
