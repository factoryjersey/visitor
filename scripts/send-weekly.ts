/**
 * The weekly What's On email, for the seven days from today (Jersey's today):
 *
 *   pnpm email:weekly                       send to everyone due it
 *   pnpm email:weekly --preview week.html   write the email to a file, send nothing
 *   pnpm email:weekly --to you@example.com  send one copy to that address only (its links are dummies)
 *   pnpm email:weekly --from 2026-10-29     a week other than this one
 *
 * Railway's `weekly-email` service runs it on Thursday mornings. Running
 * it twice in a week sends nobody a second copy.
 */
import '@/lib/load-env';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { client } from '@/lib/db';
import { jerseyToday } from '@/lib/domain/when';
import { emailEnabled, sendEmail } from '@/lib/email/send';
import { weeklyEmail } from '@/lib/email/weekly';
import { sendWeekly, weeklyContent } from '@/lib/newsletter';
import { site } from '@/lib/email/templates';

const { values } = parseArgs({ options: { preview: { type: 'string' }, to: { type: 'string' }, from: { type: 'string' } } });
const from = values.from ?? jerseyToday();
if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
  console.error(`--from wants YYYY-MM-DD, not ${from}`);
  process.exit(1);
}

let code = 0;
try {
  if (values.preview || values.to) {
    const content = await weeklyContent(from);
    console.log(`${content.items.length} listings, ${content.from} to ${content.to}`);
    const dummy = { leave: `${site()}/subscribe`, oneClick: `${site()}/api/unsubscribe?t=preview` };
    const email = weeklyEmail(content, dummy);
    if (values.preview) {
      writeFileSync(values.preview, email.html);
      console.log(`"${email.subject}" written to ${values.preview}`);
    }
    if (values.to) {
      if (!emailEnabled()) throw new Error('RESEND_API_KEY is not set');
      if (!(await sendEmail({ to: values.to, ...email }))) throw new Error(`not sent to ${values.to}`);
      console.log(`"${email.subject}" sent to ${values.to}`);
    }
  } else {
    if (!emailEnabled()) throw new Error('RESEND_API_KEY is not set: nothing can be sent');
    const r = await sendWeekly(from);
    if (r.listings === 0) console.log(`Nothing on from ${from}: no email this week.`);
    else console.log(`${r.listings} listings; ${r.sent} of ${r.recipients} sent${r.failed ? `, ${r.failed} failed (run again to retry them)` : ''}`);
    if (r.failed) code = 1;
  }
} catch (e) {
  console.error((e as Error).message);
  code = 1;
} finally {
  await client.end();
}
process.exit(code);
