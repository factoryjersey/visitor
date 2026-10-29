import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventLanding } from '@/components/site/event-landing';
import { publicEventMonths, publicEvents } from '@/lib/db/public';
import { typeFromSlug, typePath } from '@/lib/domain/landing';
import { jerseyToday } from '@/lib/domain/when';

/**
 * A kind of event, all of them still to come: /whats-on/music (the
 * middleware sends that address here). Built ahead and redrawn every ten
 * minutes. Health & wellbeing also shows what What's on keeps back for it.
 */
export const revalidate = 600;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ kind: string }> };

const phrase = (type: string) => (type === 'Family friendly' ? 'Family-friendly events' : type === 'Seasonal' ? 'Seasonal events' : `${type} events`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const type = typeFromSlug((await params).kind);
  if (!type) return {};
  return { title: `${phrase(type)} in Jersey`, description: `${phrase(type)} coming up in Jersey, by month.`, alternates: { canonical: typePath(type) } };
}

export default async function WhatsOnType({ params }: Props) {
  const type = typeFromSlug((await params).kind);
  if (!type) notFound();
  const today = jerseyToday();
  const [all, months] = await Promise.all([publicEvents(), publicEventMonths()]);
  const rows = all
    .filter((r) => r.siteTypes.includes(type) && (!r.hidden || type === 'Health & wellbeing'))
    .map((r) => ({ ...r, event: { ...r.event, eventTypes: r.siteTypes } }));
  return (
    <EventLanding
      title={`${phrase(type)} in Jersey`}
      intro={`${rows.length} coming up, soonest first.`}
      rows={rows}
      shownFrom={today}
      by="month"
      months={months}
      current={typePath(type)}
      empty={`No ${phrase(type).toLowerCase()} listed at the moment.`}
    />
  );
}

