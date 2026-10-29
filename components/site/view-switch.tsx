'use client';

import { LayoutGrid, List, Square } from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { View } from '@/lib/view';

/**
 * How a listing lays its cards out: one big card at a time on a phone
 * (three across on a desktop), two small ones side by side, or a list of
 * rows. The choice is the visitor's and is kept in a cookie, so the server
 * draws the page their way the first time and every listing follows it.
 *
 * The frame carries the choice as data-view; the grids and cards inside
 * style themselves by it (group-data-[view=…]/view), so changing it is
 * instant and needs nothing from the server.
 */
const ViewContext = createContext<{ view: View; setView: (v: View) => void }>({ view: 'one', setView: () => {} });

/**
 * A page built ahead of time (a month of What's on) cannot read the
 * cookie on the server: it leaves `initial` out, draws one column, and
 * takes up the visitor's choice once it is in the browser.
 */
export function ViewFrame({ initial, children, className = '' }: { initial?: View; children: React.ReactNode; className?: string }) {
  const [view, set] = useState<View>(initial ?? 'one');
  useEffect(() => {
    if (initial) return;
    const saved = /(?:^|;\s*)view=(one|two|list)/.exec(document.cookie)?.[1] as View | undefined;
    if (saved) set(saved);
  }, [initial]);
  const setView = (v: View) => {
    set(v);
    document.cookie = `view=${v}; path=/; max-age=31536000; samesite=lax`;
  };
  return (
    <ViewContext.Provider value={{ view, setView }}>
      <div data-view={view} className={`group/view ${className}`}>
        {children}
      </div>
    </ViewContext.Provider>
  );
}

const OPTIONS: [View, string, typeof Square][] = [
  ['one', 'One column', Square],
  ['two', 'Two columns', LayoutGrid],
  ['list', 'List', List],
];

export function ViewToggle({ className = '' }: { className?: string }) {
  const { view, setView } = useContext(ViewContext);
  return (
    <div role="radiogroup" aria-label="View" className={`inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-harbour/15 ${className}`}>
      {OPTIONS.map(([v, label, Icon]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={view === v}
          aria-label={label}
          title={label}
          onClick={() => setView(v)}
          className={`flex h-8 w-9 items-center justify-center rounded-full transition-colors ${view === v ? 'bg-harbour text-white' : 'text-harbour/60 hover:text-brand'}`}
        >
          <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
