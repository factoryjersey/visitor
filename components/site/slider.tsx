'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * One row that slides sideways, with small arrows on whichever side has
 * more to see and a soft fade at that edge. Swipe or scroll as well; the
 * arrows only ever show what can be reached.
 */
export function Slider({ children, label }: { children: React.ReactNode; label: string }) {
  const row = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const update = () => setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    update();
    // Where the chosen tile is, so a choice near the end is not hidden on the next page.
    el.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  const move = (dir: -1 | 1) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.75, behavior: 'smooth' });
  const arrow = (dir: -1 | 1, show: boolean) => (
    <button
      type="button"
      data-slider-edge
      onClick={() => move(dir)}
      aria-label={dir < 0 ? `Scroll ${label} left` : `Scroll ${label} right`}
      tabIndex={-1}
      className={`absolute top-[1.15rem] z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-harbour shadow-md ring-1 ring-harbour/10 transition-opacity hover:text-brand ${dir < 0 ? 'left-0' : 'right-0'} ${show ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      {dir < 0 ? <ChevronLeft className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
    </button>
  );

  return (
    <div className="relative">
      {arrow(-1, edge.left)}
      <div data-slider-edge className={`pointer-events-none absolute inset-y-0 left-0 z-[5] w-10 bg-gradient-to-r from-white to-transparent transition-opacity ${edge.left ? 'opacity-100' : 'opacity-0'}`} />
      <ul ref={row} data-slider-row className="flex snap-x gap-1 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </ul>
      <div data-slider-edge className={`pointer-events-none absolute inset-y-0 right-0 z-[5] w-10 bg-gradient-to-l from-white to-transparent transition-opacity ${edge.right ? 'opacity-100' : 'opacity-0'}`} />
      {arrow(1, edge.right)}
    </div>
  );
}
