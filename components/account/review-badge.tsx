import clsx from '@/lib/clsx';
import type { Review } from '@/lib/db/schema';

/** Where a listing stands with us, as its provider sees it. */
export function ReviewBadge({ review, changeWaiting }: { review: Review; changeWaiting?: boolean }) {
  const [text, style] =
    review === 'pending'
      ? ['Awaiting review', 'bg-amber-100 text-amber-800']
      : review === 'rejected'
        ? ['Not accepted', 'bg-red-100 text-red-800']
        : changeWaiting
          ? ['Live · change awaiting review', 'bg-sky-100 text-sky-800']
          : ['Live', 'bg-emerald-100 text-emerald-800'];
  return <span className={clsx('inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', style)}>{text}</span>;
}
