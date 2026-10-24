'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export type HeroSlide = {
  key: string;
  href: string;
  title: string;
  /** "Highlight", "Festival", or nothing. */
  label: string | null;
  /** "Sat 24 Oct · Fort Regent" */
  meta: string | null;
  src: string;
  alt: string;
};

const INTERVAL_MS = 7000;

/**
 * The front page's lead events, one at a time. The server renders every
 * slide with the first one showing, so it reads without JavaScript; the
 * client then moves on every few seconds, holding still while the
 * visitor hovers, focuses inside, has paused it, has the tab hidden or
 * prefers reduced motion.
 */
export function HeroRotator({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const count = slides.length;
  const many = count > 1;

  const go = useCallback((i: number) => setCurrent(((i % count) + count) % count), [count]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setReducedMotion(mq.matches);
    const onVisibility = () => setHidden(document.hidden);
    onMotion();
    mq.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      mq.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const rotating = many && !paused && !hovered && !focused && !hidden && !reducedMotion;

  useEffect(() => {
    if (!rotating) return;
    const t = window.setTimeout(() => go(current + 1), INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [rotating, current, go]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      className="relative isolate overflow-hidden bg-harbour text-white"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Keyboard focus holds the slide; a mouse click on a control doesn't, or it would never start again.
      onFocus={(e) => setFocused(e.target.matches(':focus-visible'))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === 'ArrowRight') go(current + 1);
        else if (e.key === 'ArrowLeft') go(current - 1);
      }}
    >
      <div className="grid" aria-live={rotating ? 'off' : 'polite'}>
        {slides.map((s, i) => {
          const active = i === current;
          return (
            <div
              key={s.key}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${s.title}`}
              aria-hidden={!active}
              inert={!active}
              className={`relative isolate [grid-area:1/1] transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${active ? 'z-10 opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.src}
                alt={s.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'low'}
                className="absolute inset-0 -z-10 h-full w-full object-cover opacity-55"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-harbour via-harbour/40 to-transparent" />
              <div className={`mx-auto flex min-h-[460px] max-w-6xl flex-col justify-end px-4 pt-24 ${many ? 'pb-20' : 'pb-12'}`}>
                {s.label && <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">{s.label}</p>}
                <h2 className="mt-2 max-w-3xl font-display text-3xl font-light leading-tight tracking-tight md:text-5xl">{s.title}</h2>
                {s.meta && <p className="mt-3 text-lg text-white/90">{s.meta}</p>}
                <div className="mt-6">
                  <Link href={s.href} className="inline-block rounded bg-brand px-5 py-3 text-sm font-semibold hover:bg-white hover:text-harbour">
                    Find out more<span className="sr-only"> about {s.title}</span>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {many && (
        <div className="absolute inset-x-0 bottom-0 z-20">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pb-6">
            <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play slides' : 'Pause slides'} className={controlClass}>
              {paused ? <PlayIcon /> : <PauseIcon />}
            </button>
            <button type="button" onClick={() => go(current - 1)} aria-label="Previous slide" className={controlClass}>
              <ChevronIcon flip />
            </button>
            <button type="button" onClick={() => go(current + 1)} aria-label="Next slide" className={controlClass}>
              <ChevronIcon />
            </button>
            <div className="ml-2 flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Slide ${i + 1}: ${s.title}`}
                  aria-current={i === current ? 'true' : undefined}
                  className="group flex h-6 items-center"
                >
                  <span className={`block h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${i === current ? 'w-8 bg-brand' : 'w-4 bg-white/50 group-hover:bg-white'}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const controlClass =
  'flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur hover:bg-white hover:text-harbour focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

const PauseIcon = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
    <rect x="3" y="2" width="3.5" height="12" rx="1" />
    <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
    <path d="M4 2.5v11a.5.5 0 0 0 .76.43l9-5.5a.5.5 0 0 0 0-.86l-9-5.5A.5.5 0 0 0 4 2.5Z" />
  </svg>
);

const ChevronIcon = ({ flip }: { flip?: boolean }) => (
  <svg viewBox="0 0 16 16" className={`h-4 w-4 ${flip ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="m6 3 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
