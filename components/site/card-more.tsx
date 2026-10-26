'use client';

import { useId, useState } from 'react';

/**
 * A card's foot: the price, and a small arrow that folds down the
 * listing's one sentence. Outside the card's link, so opening it does not
 * open the page.
 */
export function CardMore({ price, summary }: { price?: string | null; summary?: string | null }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!price && !summary) return null;
  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{price}</p>
        {summary && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={id}
            aria-label={open ? 'Hide description' : 'Show description'}
            className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-full text-harbour/50 transition-colors hover:bg-harbour/5 hover:text-brand"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
              <path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      {summary && (
        <div id={id} className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <p className="overflow-hidden text-sm leading-relaxed text-harbour/75" inert={!open}>
            <span className="block pt-2">{summary}</span>
          </p>
        </div>
      )}
    </div>
  );
}
