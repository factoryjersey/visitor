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
 * the visitor can see the new count and pick again; so do the quick picks
 * for when. The footer button shows the results, applying a typed search
 * or chosen dates first.
 */
export function FilterPane(props: {
  children: React.ReactNode;
  active: number;
  results: number;
  noun: string;
  /** Beside the count on a phone: the view switch. */
  aside?: React.ReactNode;
  /** The panel's name and its button's: Filters, or Search. */
  title?: string;
  /** The whole screen on a phone, not a drawer. */
  full?: boolean;
  /** Open as the page loads, on a phone: the search, before anything is asked. */
  startOpen?: boolean;
  /** The footer button's words in place of "Show 12 events": the search's "Search" before anything is asked. */
  button?: string;
}) {
  const title = props.title ?? 'Filters';
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
    if (props.startOpen && mq.matches) setOpen(true);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While open: Escape closes, the page behind does not scroll, and focus starts in the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // The search box when there is one, ready to type in; otherwise the panel.
    const box = panel.current?.querySelector<HTMLInputElement>('input[type=search]');
    if (box) box.focus({ preventScroll: true });
    else panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };
  // The footer button applies what the form says but the page does not yet show (a search typed, dates chosen), then closes.
  const settled = (p: URLSearchParams) =>
    [...p.entries()]
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join('&');
  const show = () => {
    const f = panel.current?.querySelector('form');
    if (f && settled(new URLSearchParams(new FormData(f) as unknown as Record<string, string>)) !== settled(new URLSearchParams(window.location.search))) f.requestSubmit();
    close();
  };
  const shut = phone && !open;
  const what = `${props.results} ${props.results === 1 ? props.noun.replace(/s$/, '') : props.noun}`;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3 md:hidden">
        <button
          ref={opener}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="filter-pane"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm ring-1 ring-harbour/15 hover:ring-brand/40"
        >
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          {title}
          {props.active > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[0.7rem] text-white">{props.active}</span>}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-harbour/60">{what}</span>
          {props.aside}
        </div>
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
        aria-label={phone ? title : undefined}
        tabIndex={phone ? -1 : undefined}
        inert={shut}
        className={`outline-none max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-50 max-md:flex ${props.full ? 'max-md:w-full' : 'max-md:w-[min(24rem,88vw)]'} max-md:flex-col max-md:bg-white max-md:transition-transform max-md:duration-300 max-md:ease-out ${open ? 'max-md:shadow-2xl' : 'max-md:translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-harbour/10 bg-white px-4 py-3 md:hidden">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button type="button" onClick={close} aria-label={`Close ${title.toLowerCase()}`} className="rounded-full p-2 text-harbour hover:bg-harbour/5 hover:text-brand">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {/* In the panel the fields go full width, the kinds show as a list in place of the tiles, and the footer button stands in for the form's own. */}
        <div
          className="max-md:flex-1 max-md:overflow-y-auto max-md:p-4 max-md:[&_[data-kind-tiles]]:hidden max-md:[&_form]:p-0 max-md:[&_form]:shadow-none max-md:[&_form]:ring-0 max-md:[&_form>label]:w-full max-md:[&_form>label]:min-w-0 max-md:[&_form_button[type=submit]]:hidden"
        >
          {props.children}
        </div>
        <div className="border-t border-harbour/10 bg-white p-4 md:hidden">
          <button type="button" onClick={show} className="w-full rounded bg-harbour px-4 py-3 text-sm font-semibold text-white hover:bg-sea">
            {props.button ?? `Show ${what}`}
          </button>
        </div>
      </div>
    </>
  );
}
