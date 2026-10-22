'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * On a phone, the search, selects and kind tiles take up the screen before
 * a single listing; so there they sit behind a Filters button and slide in
 * from the side, all in one place. On anything wider they show as before,
 * in the page. One copy of the filters either way: the panel is the same
 * element, placed off-canvas below md.
 *
 * Picking a kind changes the page underneath without closing the panel, so
 * the visitor can see the new count and pick again. The footer button shows
 * the results, applying the search and selects first if they changed.
 */
export function FilterPane(props: { children: React.ReactNode; active: number; results: number; noun: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767.98px)');
    const update = () => {
      setPhone(mq.matches);
      if (!mq.matches) setOpen(false);
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // While open: Escape closes, the page behind does not scroll, and focus starts in the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };
  // What the search and selects said when the panel opened: changed, the footer button submits them; otherwise it just closes.
  const asOpened = useRef('');
  const form = () => panel.current?.querySelector('form') ?? null;
  const said = (f: HTMLFormElement) => new URLSearchParams(new FormData(f) as unknown as Record<string, string>).toString();
  const openPane = () => {
    const f = form();
    asOpened.current = f ? said(f) : '';
    setOpen(true);
  };
  const show = () => {
    const f = form();
    if (f && said(f) !== asOpened.current) f.requestSubmit();
    else close();
  };
  const shut = phone && !open;
  const what = `${props.results} ${props.results === 1 ? props.noun.replace(/s$/, '') : props.noun}`;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3 md:hidden">
        <button
          ref={opener}
          type="button"
          onClick={openPane}
          aria-expanded={open}
          aria-controls="filter-pane"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm ring-1 ring-harbour/15 hover:ring-brand/40"
        >
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          Filters
          {props.active > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[0.7rem] text-white">{props.active}</span>}
        </button>
        <span className="text-sm text-harbour/60">{what}</span>
      </div>

      <div
        aria-hidden="true"
        onClick={close}
        className={`fixed inset-0 z-40 bg-harbour/40 transition-opacity duration-300 md:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      <div
        id="filter-pane"
        ref={panel}
        role={phone ? 'dialog' : undefined}
        aria-modal={phone && open ? true : undefined}
        aria-label={phone ? 'Filters' : undefined}
        tabIndex={phone ? -1 : undefined}
        inert={shut}
        className={`outline-none max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-50 max-md:flex max-md:w-[min(24rem,88vw)] max-md:flex-col max-md:bg-white max-md:transition-transform max-md:duration-300 max-md:ease-out ${open ? 'max-md:shadow-2xl' : 'max-md:translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-harbour/10 bg-white px-4 py-3 md:hidden">
          <h2 className="font-display text-lg font-semibold text-ink">Filters</h2>
          <button type="button" onClick={close} aria-label="Close filters" className="rounded-full p-2 text-harbour hover:bg-harbour/5 hover:text-brand">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {/* In the panel the fields go full width, the kind tiles wrap into a grid rather than sliding sideways, and the footer button stands in for the form's own. */}
        <div
          className="max-md:flex-1 max-md:overflow-y-auto max-md:p-4 max-md:[&_[data-slider-edge]]:hidden max-md:[&_[data-slider-row]]:flex-wrap max-md:[&_[data-slider-row]]:overflow-visible max-md:[&_form]:p-0 max-md:[&_form]:shadow-none max-md:[&_form]:ring-0 max-md:[&_form_label]:w-full max-md:[&_form_label]:min-w-0 max-md:[&_form_button[type=submit]]:hidden max-md:[&_nav]:mb-0"
        >
          {props.children}
        </div>
        <div className="border-t border-harbour/10 bg-white p-4 md:hidden">
          <button type="button" onClick={show} className="w-full rounded bg-harbour px-4 py-3 text-sm font-semibold text-white hover:bg-sea">
            Show {what}
          </button>
        </div>
      </div>
    </>
  );
}
