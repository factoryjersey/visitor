import { type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth/session';
import { toCsv, utf16le } from '@/lib/domain/csv';
import { layoutsFrom } from '@/lib/domain/guide-entry';
import { buildGuide, isDraft, VENUE_COLUMNS, windowFrom } from '@/lib/guide';

/** The venue selection as an InDesign Data Merge source, in page order: section, area, then full pages, grid boxes and directory lines. */
export async function GET(request: NextRequest) {
  await requireStaff();
  const sp = request.nextUrl.searchParams;
  const { venues } = await buildGuide(windowFrom({ from: sp.get('from') ?? undefined, to: sp.get('to') ?? undefined }), { draft: isDraft(sp.get('draft')), layouts: layoutsFrom((k) => sp.get(k)) });
  const csv = toCsv(VENUE_COLUMNS, venues.map((v) => [v.section, v.area, v.name, v.label, v.size, 'frame' in v ? String(v.frame) : v.size === 'full' ? 'full' : 'directory', v.copy, v.address, v.phone, v.email, v.website, v.imageUrl]));
  return new Response(utf16le(csv), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-16le',
      'Content-Disposition': 'attachment; filename="venues.csv"',
    },
  });
}
