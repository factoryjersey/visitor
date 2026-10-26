'use client';

import { CalendarDays, Loader2, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GENRE_MARKERS, MARKERS } from './category-markers';
import { SearchHit } from './search-hit';
import { KINDS, KIND_LABEL, type Hit, type Kind } from '@/lib/domain/search';
import { addDays, WHEN_PICKS } from '@/lib/domain/when';

type Answer = {
  asked: boolean;
  range: { from: string; to: string; label: string } | null;
  counts: Record<Kind | 'all', number>;
  cats: Record<string, number>;
  hits: Hit[];
};

/** Events' kinds, then tours' genres, each with its icon, in the order the site shows them. */
const CATEGORIES: [string, (typeof MARKERS)[number][1]][] = [...MARKERS, ...(Object.entries(GENRE_MARKERS) as [string, (typeof MARKERS)[number][1]][])];
const PREVIEW = 4;

const pill = (on: boolean) =>
  `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm transition ${on ? 'bg-harbour font-semibold text-white' : 'bg-white font-medium text-ink ring-1 ring-harbour/15 hover:ring-brand/50'}`;
const row = '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/**
 * Search over the whole site, sliding over whatever page the visitor is on:
 * words, when, what kind of thing and which category, answered as they
 * type and tap. It keeps what was asked while closed, so going back to it
 * after looking at a result carries on where they were. The full search
 * lives at /search too, as an address to share and for browsers without
 * scripts; the header's link goes there until this opens.
 */
export function SearchPanel({ open, onClose, today }: { open: boolean; onClose: () => void; today: string }) {
  const [q, setQ] = useState('');
  const [typed, setTyped] = useState('');
  const [when, setWhen] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kind, setKind] = useState<Kind | ''>('');
  const [cats, setCats] = useState<string[]>([]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const path = usePathname();

  // What is typed is asked a moment after the typing stops.
  useEffect(() => {
    const t = setTimeout(() => setQ(typed.trim()), 250);
    return () => clearTimeout(t);
  }, [typed]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (when && when !== 'dates') p.set('when', when);
    if (when === 'dates' && from) p.set('from', from);
    if (when === 'dates' && to) p.set('to', to);
    if (kind) p.set('kind', kind);
    for (const c of cats) p.append('cat', c);
    return p.toString();
  }, [q, when, from, to, kind, cats]);

  useEffect(() => {
    if (!open) return;
    const ctl = new AbortController();
    setLoading(true);
    fetch(`/api/search?${params}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((a: Answer) => setAnswer(a))
      .catch(() => {})
      .finally(() => !ctl.signal.aborted && setLoading(false));
    return () => ctl.abort();
  }, [open, params]);

  // Going to a result closes it; Escape does too. While open the page behind stays put and focus starts in the box.
  useEffect(() => onClose(), [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  const toggleCat = (c: string) => setCats((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));
  const clear = () => {
    setTyped('');
    setQ('');
    setWhen('');
    setFrom('');
    setTo('');
    setKind('');
    setCats([]);
    input.current?.focus();
  };

  const counts = answer?.counts;
  const shownCats = CATEGORIES.filter(([c]) => (answer?.cats[c] ?? 0) > 0 || cats.includes(c));
  // A kind with nothing to show has no pill, unless it is the one chosen.
  const kinds = KINDS.filter((k) => (counts?.[k] ?? 0) > 0 || kind === k);
  const hits = answer?.hits ?? [];
  const anything = typed || when || kind || cats.length;

  return (
    <>
      <div aria-hidden="true" onClick={onClose} className={`fixed inset-0 z-40 bg-harbour/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <div
        ref={panel}
        role="dialog"
        aria-modal={open || undefined}
        aria-label="Search"
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[30rem] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="border-b border-harbour/10 px-4 pb-3 pt-3">
          <form
            role="search"
            action="/search"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(typed.trim());
              input.current?.blur();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-harbour/50" />
              <input
                ref={input}
                type="search"
                name="q"
                value={typed}
                onChange={(e) => setTyped(e.currentTarget.value)}
                placeholder="Events, tours, places…"
                aria-label="Search events, tours, experiences and venues"
                enterKeyHint="search"
                autoComplete="off"
                className="w-full rounded-full border border-harbour/20 bg-white py-3 pl-11 pr-10 text-base text-ink outline-none placeholder:text-harbour/45 focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              {loading && <Loader2 aria-hidden="true" className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-harbour/40" />}
            </div>
            <button type="button" onClick={onClose} aria-label="Close search" className="-mr-1 rounded-full p-2.5 text-harbour hover:bg-harbour/5 hover:text-brand">
              <X aria-hidden="true" className="h-6 w-6" />
            </button>
          </form>

          <fieldset className="mt-3 min-w-0">
            <legend className="sr-only">When</legend>
            <div className={row}>
              <button type="button" aria-pressed={!when} onClick={() => setWhen('')} className={pill(!when)}>Any time</button>
              {WHEN_PICKS.map((w) => (
                <button key={w.value} type="button" aria-pressed={when === w.value} onClick={() => setWhen(when === w.value ? '' : w.value)} className={pill(when === w.value)}>
                  {w.label}
                </button>
              ))}
              <button type="button" aria-pressed={when === 'dates'} onClick={() => setWhen(when === 'dates' ? '' : 'dates')} className={pill(when === 'dates')}>
                <CalendarDays aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
                Choose dates
              </button>
            </div>
            {when === 'dates' && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <label className="flex flex-col text-sm">
                  <span className="mb-1 text-xs text-harbour/60">From</span>
                  <input type="date" value={from} min={today} onChange={(e) => setFrom(e.currentTarget.value)} className="w-full rounded border border-harbour/20 bg-white px-3 py-2" />
                </label>
                <label className="flex flex-col text-sm">
                  <span className="mb-1 text-xs text-harbour/60">To</span>
                  <input type="date" value={to} min={from || today} max={addDays(today, 730)} onChange={(e) => setTo(e.currentTarget.value)} className="w-full rounded border border-harbour/20 bg-white px-3 py-2" />
                </label>
              </div>
            )}
          </fieldset>

          {shownCats.length > 0 && (
            <fieldset className="mt-2 min-w-0">
              <legend className="sr-only">Category</legend>
              <div className={row}>
                {shownCats.map(([c, Icon]) => {
                  const on = cats.includes(c);
                  return (
                    <button key={c} type="button" aria-pressed={on} onClick={() => toggleCat(c)} className={pill(on)}>
                      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
                      {c}
                      <span className={`text-xs ${on ? 'text-white/70' : 'text-harbour/45'}`}>{answer?.cats[c] ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10 pt-3">
          {answer?.asked && counts && (
            <nav aria-label="Kind" className={`${row} mb-4`}>
              <button type="button" aria-pressed={!kind} onClick={() => setKind('')} className={pill(!kind)}>
                All <span className={`text-xs ${!kind ? 'text-white/70' : 'text-harbour/45'}`}>{counts.all}</span>
              </button>
              {kinds.map((k) => (
                <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(kind === k ? '' : k)} className={pill(kind === k)}>
                  {KIND_LABEL[k]} <span className={`text-xs ${kind === k ? 'text-white/70' : 'text-harbour/45'}`}>{counts[k]}</span>
                </button>
              ))}
            </nav>
          )}

          {!answer?.asked && (
            <p className="mt-2 text-harbour/70">Type what you’re after, or pick a day or a category to see what’s on.</p>
          )}

          {answer?.asked && hits.length === 0 && !loading && (
            <p className="rounded-lg p-6 text-center text-harbour/70 ring-1 ring-harbour/10">
              Nothing matches.{' '}
              {anything && (
                <button type="button" onClick={clear} className="font-medium text-brand underline">
                  Start again
                </button>
              )}
            </p>
          )}

          {answer?.asked && !kind &&
            KINDS.map((k) => {
              const of = hits.filter((h) => h.kind === k);
              if (!of.length) return null;
              const n = counts?.[k] ?? of.length;
              return (
                <section key={k} className="mb-6">
                  <h2 className="mb-2 flex items-baseline justify-between">
                    <span className="font-display text-base font-semibold text-ink">{KIND_LABEL[k]}</span>
                    {n > PREVIEW && (
                      <button type="button" onClick={() => setKind(k)} className="text-sm font-semibold text-brand hover:underline">
                        See all {n} →
                      </button>
                    )}
                  </h2>
                  <ul className="grid gap-2">{of.slice(0, PREVIEW).map((h) => <SearchHit key={h.id} hit={h} />)}</ul>
                </section>
              );
            })}

          {answer?.asked && kind && hits.length > 0 && (
            <>
              <ul className="grid gap-2">{hits.map((h) => <SearchHit key={h.id} hit={h} />)}</ul>
              {(counts?.[kind] ?? 0) > hits.length && (
                <Link href={`/search?${params}`} className="mt-4 block text-center text-sm font-semibold text-brand hover:underline">
                  See all {counts?.[kind]} on one page →
                </Link>
              )}
            </>
          )}

          {answer?.range && answer.asked && <p className="mt-2 text-center text-xs text-harbour/50">{answer.range.label}</p>}
        </div>
      </div>
    </>
  );
}
