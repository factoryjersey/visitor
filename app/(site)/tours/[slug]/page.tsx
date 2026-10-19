import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Copy, DateList, Facts, Hero, directionsUrl, primaryButton, secondaryButton, timesSummary } from '@/components/site/detail';
import { StaffEdit } from '@/components/site/staff-edit';
import { staffViewer } from '@/lib/auth/session';
import { publicTour, todayIso } from '@/lib/db/public';
import { GENRES } from '@/lib/domain/genre';
import { printPrice, printTimes } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import { UNIQUE } from '@/lib/domain/occurrence';
import { webWhen } from '@/lib/domain/web-dates';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await publicTour((await params).slug);
  if (!row) return {};
  const t = row.tour;
  return {
    title: t.title,
    description: t.summary ?? undefined,
    openGraph: { title: t.title, description: t.summary ?? undefined, images: t.headerImage ? [webImage(t.headerImage, 1200, 630)] : [] },
  };
}

export default async function TourPage({ params }: Props) {
  const row = await publicTour((await params).slug);
  if (!row) notFound();
  const { tour: t, provider } = row;
  const today = todayIso();
  const dated = UNIQUE.includes(t.occurrence);
  const directions = directionsUrl(t.lat, t.lon, t.meetingPoint);
  const book = t.website ?? provider?.website;
  const staff = await staffViewer();

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      {staff && <StaffEdit kind="experience" id={t.id} title={t.title} summary={t.summary} description={t.description} genre={t.genre} genres={GENRES} adminHref={`/admin/tours/${t.slug}`} />}
      <Link href="/tours" className="text-sm text-harbour/60 hover:text-brand">← Tours &amp; experiences</Link>
      <header className="mb-6 mt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand">{t.highlight ? 'Highlight' : t.genre ?? 'Experience'}</p>
        <h1 className="font-display text-3xl font-bold leading-tight text-ink md:text-4xl">{t.title}</h1>
        <p className="mt-2 text-lg font-medium text-sea">{dated ? webWhen(t.dates, t.occurrence, today) : 'Book any day'}{provider && <span className="text-harbour/60"> · with {provider.name}</span>}</p>
      </header>
      <Hero image={t.headerImage} title={t.title} />
      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Copy lead={t.guideCopy ?? t.summary} body={t.description} />
          {dated && <DateList dates={t.dates} today={today} />}
        </div>
        <Facts
          rows={[
            ['When', dated ? webWhen(t.dates, t.occurrence, today) : 'Book any day, subject to availability'],
            ['Times', dated ? timesSummary(printTimes(t.dates.filter((d) => d.date >= today))) : null],
            ['Duration', t.duration],
            ['Price', printPrice(t.fromPricePence, t.toPricePence)],
            ['Meeting point', t.meetingPoint],
            ['Run by', provider?.name],
            ['Contact', t.phone ? <a href={`tel:${t.phone.replace(/[^\d+]/g, '')}`} className="hover:text-brand">{t.phone}</a> : t.email && <a href={`mailto:${t.email}`} className="hover:text-brand">{t.email}</a>],
          ]}
          actions={
            <>
              {book && <a href={book} target="_blank" rel="noopener" className={primaryButton}>Book with {provider?.name ?? 'the provider'}</a>}
              {directions && <a href={directions} target="_blank" rel="noopener" className={secondaryButton}>Directions</a>}
              {!t.businessId && (
                <Link href={`/claim/tours/${t.slug}`} className="mt-2 text-center text-xs text-harbour/50 underline decoration-harbour/20 underline-offset-2 hover:text-brand">
                  Run this tour? Claim it
                </Link>
              )}
            </>
          }
        />
      </div>
    </article>
  );
}
