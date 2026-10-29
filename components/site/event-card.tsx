import Link from 'next/link';
import { ListingCard, cardLocation } from '@/components/site/listing-card';
import type { PublicEventRow } from '@/lib/db/public';
import { printPrice } from '@/lib/domain/house-style';
import { monthPath, monthTitle } from '@/lib/domain/months';
import { WEEKEND_PATH } from '@/lib/domain/landing';
import { UNIQUE } from '@/lib/domain/occurrence';
import { cardWhen } from '@/lib/domain/web-dates';

/** An event's card on What's on and its month pages: when (from `shownFrom` on), where, the price and its blurb. */
export function EventCard({ row: { event: e, venue }, shownFrom, highlight = false, wide = false }: { row: Pick<PublicEventRow, 'event' | 'venue'>; shownFrom: string; highlight?: boolean; wide?: boolean }) {
  return (
    <ListingCard
      href={`/whats-on/${e.slug}`}
      title={e.title}
      when={cardWhen(e.dates, e.occurrence, shownFrom)}
      location={cardLocation(e.venueName ?? venue?.name ?? e.venue, e.parish ?? venue?.parish)}
      price={printPrice(e.fromPricePence, e.toPricePence, { free: e.free })}
      image={e.headerImage}
      types={e.eventTypes}
      tag={UNIQUE.includes(e.occurrence) ? null : e.occurrence === 'regular' ? 'Regular' : 'Ongoing'}
      highlight={highlight}
      featured={highlight}
      wide={wide}
      summary={wide ? (e.guideCopy ?? e.summary) : (e.summary ?? e.guideCopy)}
    />
  );
}

/** The months with something on, each a page of its own, and how many events: the way through What's on a month at a time. */
export function MonthNav({ months, current, weekend = false }: { months: { ym: string; n: number }[]; current?: string; weekend?: boolean }) {
  if (!months.length) return null;
  return (
    <nav aria-label="Months" className="mb-8 flex gap-2 overflow-x-auto pb-1">
      {weekend && (
        <Link href={WEEKEND_PATH} className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white ring-1 ring-brand hover:bg-harbour">
          This weekend
        </Link>
      )}
      {months.map(({ ym, n }) => (
        <Link
          key={ym}
          href={monthPath(ym)}
          aria-current={ym === current ? 'page' : undefined}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm ring-1 ${ym === current ? 'bg-harbour text-white ring-harbour' : 'bg-white text-harbour ring-harbour/15 hover:text-brand'}`}
        >
          {monthTitle(ym)} <span className={ym === current ? 'text-white/70' : 'text-harbour/50'}>{n}</span>
        </Link>
      ))}
    </nav>
  );
}
