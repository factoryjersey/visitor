import { and, asc, eq, inArray, isNull, lte, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { publicEvents } from '@/lib/db/public';
import { subscribers } from '@/lib/db/schema';
import { hiddenByDefault, siteTypes } from '@/lib/domain/categorise';
import { cardLocation, printPrice, printTitle } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import { addDays } from '@/lib/domain/when';
import { nextDate } from '@/lib/domain/web-dates';
import { BATCH_SIZE, sendBatch } from '@/lib/email/send';
import { site } from '@/lib/email/templates';
import { weeklyEmail, type WeeklyContent, type WeeklyItem } from '@/lib/email/weekly';
import { leaveLink, oneClickLink } from '@/lib/subscribers';

/**
 * The weekly What's On email: what the front page would show for the
 * seven days from `from`, sent to everyone on the list who has not had
 * this week's. Run by `pnpm email:weekly` on Thursday mornings.
 */

export const DAYS_COVERED = 7;

/** The week's listings, as the email shows them: unique events and highlights, nothing the site hides by default. */
export async function weeklyContent(from: string): Promise<WeeklyContent> {
  const to = addDays(from, DAYS_COVERED - 1);
  const found = await publicEvents({ range: { from, to } });
  const items: WeeklyItem[] = found
    .map((r) => ({ ...r, event: { ...r.event, eventTypes: siteTypes(r.event) } }))
    .filter((r) => !hiddenByDefault(r.event))
    .map(({ event: e, venue }) => {
      const day = nextDate(e.dates, from)!;
      const img = e.headerImage;
      return {
        title: printTitle(e.title),
        href: `${site()}/whats-on/${e.slug}`,
        image: img ? webImage(img, e.highlight ? 992 : 176, e.highlight ? 558 : 132) : null,
        alt: img?.alt ?? '',
        day,
        time: e.dates.find((d) => d.date === day)?.start?.slice(0, 5) ?? null,
        where: cardLocation(e.venueName ?? venue?.name ?? e.venue, e.parish ?? venue?.parish),
        price: printPrice(e.fromPricePence, e.toPricePence, { free: e.free }),
        summary: e.summary ?? e.guideCopy,
        highlight: e.highlight,
      };
    });
  return { from, to, items };
}

/** Everyone subscribed who has not had an email for the week starting `from`, nor one in the six days before it. */
const due = (from: string) =>
  and(eq(subscribers.status, 'subscribed'), or(isNull(subscribers.lastSentFor), lte(subscribers.lastSentFor, addDays(from, -DAYS_COVERED))));

export type SendReport = { recipients: number; sent: number; failed: number; listings: number };

/**
 * Sends the week's email in batches of a hundred, marking each batch as
 * it goes, so running it again the same week (after a failure, say) sends
 * only to those not yet sent to.
 */
export async function sendWeekly(from: string, opts: { pause?: number } = {}): Promise<SendReport> {
  const content = await weeklyContent(from);
  const report: SendReport = { recipients: 0, sent: 0, failed: 0, listings: content.items.length };
  if (content.items.length === 0) return report;

  const list = await db.select({ id: subscribers.id, email: subscribers.email, token: subscribers.token }).from(subscribers).where(due(from)).orderBy(asc(subscribers.createdAt));
  report.recipients = list.length;

  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    const batch = list.slice(i, i + BATCH_SIZE);
    const ok = await sendBatch(batch.map((s) => ({ to: s.email, ...weeklyEmail(content, { leave: leaveLink(s.token), oneClick: oneClickLink(s.token) }) })));
    if (ok) {
      await db.update(subscribers).set({ lastSentFor: from }).where(inArray(subscribers.id, batch.map((s) => s.id)));
      report.sent += batch.length;
    } else {
      report.failed += batch.length;
    }
    // Resend allows a couple of requests a second.
    if (i + BATCH_SIZE < list.length) await new Promise((r) => setTimeout(r, opts.pause ?? 600));
  }
  return report;
}
