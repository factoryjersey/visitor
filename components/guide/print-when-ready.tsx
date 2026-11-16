'use client';

import { useEffect, useState } from 'react';

/**
 * A section's PDF: once the pages have laid themselves out (the type
 * loaded, the pictures in, the copy fitted), the print dialog opens, set
 * to the guide's spreads; Save as PDF keeps it as a vector file at size.
 * The file is named for the section, as the page's title.
 */
export function PrintWhenReady({ title }: { title: string }) {
  const [state, setState] = useState<'laying out' | 'ready'>('laying out');
  useEffect(() => {
    document.title = title;
    let stop = false;
    (async () => {
      await document.fonts.ready;
      const images = [...document.querySelectorAll<HTMLImageElement>('.gp-book img')];
      await Promise.all(images.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
      // The copy is fitted, and the flowing pages poured, after the first paint: wait until the book stops changing.
      let last = '';
      for (let i = 0; i < 40 && !stop; i++) {
        await new Promise((r) => setTimeout(r, 250));
        const now = `${document.querySelectorAll('.gp-page').length}:${document.querySelector('.gp-book')?.textContent?.length ?? 0}`;
        if (now === last && !document.body.textContent?.includes('Laying out')) break;
        last = now;
      }
      if (stop) return;
      setState('ready');
      window.print();
    })();
    return () => { stop = true; };
  }, [title]);
  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-3 rounded bg-sky-50 px-3 py-2 text-sm text-sky-900">
      <p className="mr-auto">
        {state === 'laying out'
          ? 'Laying out the pages for the PDF…'
          : 'In the print dialog choose Save as PDF (margins: None). The pages come out as 230 × 165mm spreads, numbered as in the guide.'}
      </p>
      {state === 'ready' && <button type="button" onClick={() => window.print()} className="rounded border border-sky-300 bg-white px-3 py-1 hover:bg-sky-100">Print again</button>}
    </div>
  );
}
