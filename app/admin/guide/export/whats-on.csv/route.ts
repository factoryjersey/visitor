import { type NextRequest } from 'next/server';
import { toCsv, utf16le } from '@/lib/domain/csv';
import { EVENT_COLUMNS, buildGuide, windowFrom } from '@/lib/guide';

/** The What's On selection as an InDesign Data Merge source. Signed-in only, through middleware. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const window = windowFrom({ from: sp.get('from') ?? undefined, to: sp.get('to') ?? undefined });
  const { events } = await buildGuide(window);
  const csv = toCsv(EVENT_COLUMNS, events.map((e) => [e.dates, e.times, e.title, e.copy, e.price, e.venue, e.address, e.contact, e.website, e.imageUrl, e.block]));
  return new Response(utf16le(csv), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-16le',
      'Content-Disposition': `attachment; filename="whatson_${window.from}_${window.to}.csv"`,
    },
  });
}
