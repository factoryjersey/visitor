import { type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth/session';
import { toCsv, utf16le } from '@/lib/domain/csv';
import { buildGuide, EVENT_COLUMNS, isDraft, windowFrom } from '@/lib/guide';

/** The What's On selection as an InDesign Data Merge source. Signed-in only, through middleware. */
export async function GET(request: NextRequest) {
  await requireStaff();
  const sp = request.nextUrl.searchParams;
  const window = windowFrom({ from: sp.get('from') ?? undefined, to: sp.get('to') ?? undefined });
  const { events } = await buildGuide(window, { draft: isDraft(sp.get('draft')) });
  const csv = toCsv(EVENT_COLUMNS, events.map((e) => [e.frame, e.dates, e.times, e.title, e.copy, e.price, e.venue, e.address, e.contact, e.website, e.frame === 'picture' ? e.imageUrl : '', e.block]));
  return new Response(utf16le(csv), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-16le',
      'Content-Disposition': `attachment; filename="whatson_${window.from}_${window.to}.csv"`,
    },
  });
}
