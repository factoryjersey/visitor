'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { SubscribeForm } from './subscribe-form';

/** Set once the popover has shown in this browser: it is offered on the first visit only. */
const SEEN_KEY = 'visitor:weekly-email-offered';
/** Seconds on the front page before it slides in, so it never covers the page someone came to read. */
const DELAY_SECONDS = 6;

/**
 * The weekly email, offered once: a card in the corner of the front page
 * on someone's first visit, a few seconds in. Not a modal: it takes no
 * focus and blocks nothing, Escape or the cross closes it, and the
 * footer's "The weekly email" is there for anyone who closed it.
 */
export function SubscribePopover() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) !== null;
    } catch {
      // No storage (a private window, blocked site data): offer it, it just may come again.
    }
    if (seen) return;
    const t = setTimeout(() => {
      setOpen(true);
      try {
        localStorage.setItem(SEEN_KEY, new Date().toISOString());
      } catch {
        // As above.
      }
    }, DELAY_SECONDS * 1000);
    return () => clearTimeout(t);
  }, []);

  // A frame after mounting, so it slides in rather than appearing.
  useEffect(() => {
    if (!open) return;
    const f = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(f);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;
  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="weekly-email-heading"
      className={`fixed inset-x-3 bottom-3 z-50 rounded-lg bg-white p-5 shadow-2xl ring-1 ring-harbour/10 motion-safe:transition motion-safe:duration-300 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[24rem] ${shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
    >
      <button type="button" onClick={close} aria-label="Close" className="absolute right-2 top-2 rounded p-1.5 text-harbour/50 transition hover:bg-harbour/5 hover:text-harbour">
        <X className="h-4 w-4" aria-hidden />
      </button>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Every Thursday</p>
      <h2 id="weekly-email-heading" className="mt-1 pr-6 font-display text-xl font-semibold leading-tight text-ink">
        What’s on in Jersey this week, in your inbox
      </h2>
      <p className="mb-4 mt-1.5 text-sm leading-relaxed text-harbour/75">Shows, gigs, festivals, matches and markets for the week ahead. Free.</p>
      <SubscribeForm source="popover" />
    </aside>
  );
}
