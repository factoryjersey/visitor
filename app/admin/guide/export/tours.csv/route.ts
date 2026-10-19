import { type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth/session';
import { toCsv, utf16le } from '@/lib/domain/csv';
import { buildGuide, isDraft, TOUR_COLUMNS, windowFrom } from '@/lib/guide';

/** Tours for InDesign Data Merge: dated ones by date, then on-demand ones by genre. */
export async function GET(request: NextRequest) {
  await requireStaff();
  const sp = request.nextUrl.searchParams;
  const window = windowFrom({ from: sp.get('from') ?? undefined, to: sp.get('to') ?? undefined });
  const { tours } = await buildGuide(window, { draft: isDraft(sp.get('draft')) });
  const csv = toCsv(TOUR_COLUMNS, tours.map((t) => [t.kind, t.genre, t.dates, t.title, t.code, t.duration, t.times, t.copy, t.provider]));
  return new Response(utf16le(csv), {
    headers: { 'Content-Type': 'text/csv; charset=utf-16le', 'Content-Disposition': `attachment; filename="tours_${window.from}_${window.to}.csv"` },
  });
}
