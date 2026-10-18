import type { EventDate, Image } from '@/lib/db/schema';
import { webImage } from '@/lib/domain/images';
import { upcomingDates } from '@/lib/domain/web-dates';

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function Hero({ image, title }: { image: Image | null; title: string }) {
  if (!image) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={webImage(image, 1600, 760)} alt={image.alt ?? title} className="aspect-[2/1] w-full rounded-lg object-cover" />
  );
}

/** The listing's text as paragraphs. */
export function Copy({ lead, body }: { lead: string | null; body: string | null }) {
  return (
    <div className="space-y-4">
      {lead && <p className="text-lg leading-relaxed">{lead}</p>}
      {body && body !== lead && body.split(/\n{2,}/).map((p, i) => <p key={i} className="leading-relaxed text-harbour/80">{p}</p>)}
    </div>
  );
}

/** Every date still to come, with its times, when there are few enough to read. */
export function DateList({ dates, today }: { dates: readonly EventDate[]; today: string }) {
  const upcoming = upcomingDates(dates, today);
  if (upcoming.length < 2 || upcoming.length > 40) return null;
  const times = (iso: string) => dates.filter((d) => d.date === iso && d.start).map((d) => (d.end ? `${d.start}–${d.end}` : d.start)).join(', ');
  return (
    <details className="rounded-lg bg-white p-4 text-sm ring-1 ring-harbour/5">
      <summary className="cursor-pointer font-medium">All {upcoming.length} dates</summary>
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {upcoming.map((iso) => (
          <li key={iso}>{DAY.format(new Date(`${iso}T00:00:00Z`))}{times(iso) && <span className="text-harbour/60"> · {times(iso)}</span>}</li>
        ))}
      </ul>
    </details>
  );
}

/** The practical box: when, price, where, how to book. */
export function Facts({ rows, actions }: { rows: [string, React.ReactNode][]; actions: React.ReactNode }) {
  return (
    <aside className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-harbour/5">
      <dl className="space-y-3 text-sm">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-harbour/50">{k}</dt>
            <dd className="mt-0.5">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2">{actions}</div>
    </aside>
  );
}

export const primaryButton = 'rounded bg-coral px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-harbour';
export const secondaryButton = 'rounded border border-harbour/20 px-4 py-2.5 text-center text-sm font-medium hover:border-harbour';

export function directionsUrl(lat: number | null, lon: number | null, fallback: string | null): string | null {
  if (lat !== null && lon !== null) return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  return fallback ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${fallback}, Jersey`)}` : null;
}

/** Times for the facts box: one or two read fine; more than that is a list of their own. */
export function timesSummary(times: string | null): string | null {
  if (!times) return null;
  return times.split(/ \| |, /).length > 2 ? 'Varies by day, see all dates' : times;
}
