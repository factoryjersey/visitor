import type { TripadvisorRating as Rating } from '@/lib/integrations/tripadvisor/ratings';

/**
 * A venue's Tripadvisor rating, as their terms ask it be shown: their own
 * rating image, the number of reviews, Tripadvisor named, and a link to
 * the listing on their site.
 */
export function TripadvisorRating({ t }: { t: Rating }) {
  return (
    <a href={t.url} target="_blank" rel="noopener" className="mt-6 inline-flex items-center gap-2 text-sm text-harbour/80 hover:text-sea">
      {t.ratingImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.ratingImage} alt={`${t.rating.toFixed(1)} of 5 on Tripadvisor`} className="h-4 w-auto" />
      ) : (
        <b className="text-ink">{t.rating.toFixed(1)} of 5</b>
      )}
      <span>
        {t.reviews.toLocaleString('en-GB')} review{t.reviews === 1 ? '' : 's'} on Tripadvisor ↗
      </span>
    </a>
  );
}
