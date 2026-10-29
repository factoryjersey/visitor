import type { Metadata } from 'next';
import { EventLanding } from '@/components/site/event-landing';
import { publicEventMonths, publicEvents } from '@/lib/db/public';
import { WEEKEND_PATH, weekendRange } from '@/lib/domain/landing';
import { jerseyToday } from '@/lib/domain/when';

/** What's on this weekend, Friday to Sunday, by day. Built ahead and redrawn every ten minutes, so it moves on by itself. */
export const revalidate = 600;
export const metadata: Metadata = { title: "What's on this weekend", description: 'Events in Jersey this weekend, Friday to Sunday.', alternates: { canonical: WEEKEND_PATH } };

export default async function ThisWeekend() {
  const today = jerseyToday();
  const range = weekendRange(today);
  const [found, months] = await Promise.all([publicEvents({ range }), publicEventMonths()]);
  const rows = found.filter((r) => !r.hidden).map((r) => ({ ...r, event: { ...r.event, eventTypes: r.siteTypes } }));
  return (
    <EventLanding
      title="What's on this weekend"
      intro={`${rows.length} events, Friday to Sunday.`}
      rows={rows}
      shownFrom={range.from}
      by="day"
      months={months}
      current={WEEKEND_PATH}
      empty="Nothing listed for this weekend yet."
    />
  );
}
