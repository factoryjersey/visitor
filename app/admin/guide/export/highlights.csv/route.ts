import { type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth/session';
import { toCsv, utf16le } from '@/lib/domain/csv';
import { HIGHLIGHT_COLUMNS, buildGuide, windowFrom } from '@/lib/guide';

/** Highlights for their full-page InDesign template: extended copy and the original image. */
export async function GET(request: NextRequest) {
  await requireStaff();
  const sp = request.nextUrl.searchParams;
  const window = windowFrom({ from: sp.get('from') ?? undefined, to: sp.get('to') ?? undefined });
  const { highlights } = await buildGuide(window);
  const csv = toCsv(HIGHLIGHT_COLUMNS, highlights.map((e) => [e.dates, e.times, e.title, e.extendedCopy, e.price, e.venue, e.address, e.contact, e.website, e.imageUrl]));
  return new Response(utf16le(csv), {
    headers: { 'Content-Type': 'text/csv; charset=utf-16le', 'Content-Disposition': `attachment; filename="highlights_${window.from}_${window.to}.csv"` },
  });
}
