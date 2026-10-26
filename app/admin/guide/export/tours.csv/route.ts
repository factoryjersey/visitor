import { type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth/session';
import { toCsv, utf16le } from '@/lib/domain/csv';
import { iconsFor } from '@/components/guide/key-icons';
import { layoutFrom } from '@/lib/domain/guide-entry';
import { buildGuide, isDraft, TOUR_COLUMNS, windowFrom } from '@/lib/guide';

/** Tours for InDesign Data Merge: dated ones by date, then on-demand ones by genre. */
export async function GET(request: NextRequest) {
  await requireStaff();
  const sp = request.nextUrl.searchParams;
  const window = windowFrom({ from: sp.get('from') ?? undefined, to: sp.get('to') ?? undefined });
  const { tours, tourPages } = await buildGuide(window, { draft: isDraft(sp.get('draft')), layout: layoutFrom(sp.get('grid')) });
  // On the grid, the picture box is a row of its own: the picture, and the title of the listing it sits beside.
  const csv = toCsv(TOUR_COLUMNS, tours.map((t) => t.frame === 'image'
    ? [t.kind, t.genre, '', t.title, '', '', '', '', '', 'image', t.imageUrl, '']
    : [t.kind, t.genre, t.dates, t.title, t.code, t.duration, t.times, t.copy, t.provider, tourPages ? 'listing' : '', '', iconsFor(t).map((i) => i.label).join(', ')]));
  return new Response(utf16le(csv), {
    headers: { 'Content-Type': 'text/csv; charset=utf-16le', 'Content-Disposition': `attachment; filename="tours_${window.from}_${window.to}.csv"` },
  });
}
