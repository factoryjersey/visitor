'use client';

import { Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { GoogleReviews as Reviews } from '@/lib/integrations/google/places';

/**
 * A venue's Google rating and a few reviews. Asked for only when the panel
 * nears the screen, so a visitor who never scrolls this far, and a crawler,
 * costs nothing. Shown as Google's terms ask: Google Maps named as the
 * source, each reviewer named and linked, and a way to the rest on Google.
 */
function Stars({ rating, size = 'h-4 w-4' }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex" aria-label={`${rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden="true" className={`${size} ${rating >= n - 0.25 ? 'fill-amber-400 text-amber-400' : 'text-harbour/25'}`} strokeWidth={1.5} />
      ))}
    </span>
  );
}

export function GoogleReviews({ slug }: { slug: string }) {
  const ref = useRef<HTMLElement>(null);
  const [data, setData] = useState<Reviews | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    const load = () => {
      if (done) return;
      done = true;
      fetch(`/api/google-reviews/${slug}`)
        .then((r) => (r.ok ? (r.json() as Promise<Reviews>) : Promise.reject(new Error(String(r.status)))))
        .then(setData)
        .catch(() => setFailed(true));
    };
    const seen = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && load(), { rootMargin: '300px' });
    seen.observe(el);
    return () => seen.disconnect();
  }, [slug]);

  if (failed || (data && data.rating === null && !data.reviews.length)) return null;
  return (
    <section ref={ref} className="mt-12" aria-label="Reviews from Google">
      <h2 className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-harbour/15 pb-2 font-display text-xl font-semibold text-ink">
        What visitors say
        {data?.rating != null && (
          <span className="flex items-center gap-2 font-sans text-base font-normal text-harbour/80">
            <span className="font-semibold text-ink">{data.rating.toFixed(1)}</span>
            <Stars rating={data.rating} />
            <span>{data.count.toLocaleString('en-GB')} reviews on Google</span>
          </span>
        )}
      </h2>
      {!data ? (
        <div className="h-32 animate-pulse rounded-lg bg-harbour/5" />
      ) : (
        <>
          <ul className="grid gap-6 md:grid-cols-3">
            {data.reviews.slice(0, 3).map((r, i) => (
              <li key={i} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-harbour/5">
                <div className="flex items-center gap-2">
                  {r.authorPhoto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.authorPhoto} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" loading="lazy" />
                  )}
                  <span className="min-w-0 text-sm">
                    {r.authorUrl ? (
                      <a href={r.authorUrl} target="_blank" rel="noopener nofollow" className="font-semibold text-ink hover:text-brand">{r.author}</a>
                    ) : (
                      <span className="font-semibold text-ink">{r.author}</span>
                    )}
                    <span className="block text-xs text-harbour/55">{r.when}</span>
                  </span>
                </div>
                <Stars rating={r.rating} size="mt-2 h-3.5 w-3.5" />
                <p className="mt-2 line-clamp-6 text-sm leading-relaxed text-harbour/80">{r.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-harbour/60">
            <span>Reviews from <span className="font-semibold text-harbour/80">Google Maps</span></span>
            {data.mapsUrl && <a href={data.mapsUrl} target="_blank" rel="noopener" className="font-semibold text-sea hover:text-brand">Read all reviews on Google Maps ↗</a>}
          </p>
        </>
      )}
    </section>
  );
}
