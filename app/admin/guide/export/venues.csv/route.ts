import { type NextRequest } from 'next/server';
import { toCsv, utf16le } from '@/lib/domain/csv';
import { VENUE_COLUMNS, buildGuide, windowFrom } from '@/lib/guide';

/** The venue selection as an InDesign Data Merge source, in section and area order. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const { venues } = await buildGuide(windowFrom({ from: sp.get('from') ?? undefined, to: sp.get('to') ?? undefined }));
  const csv = toCsv(VENUE_COLUMNS, venues.map((v) => [v.section, v.area, v.name, v.label, v.size, v.copy, v.address, v.phone, v.website, v.imageUrl]));
  return new Response(utf16le(csv), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-16le',
      'Content-Disposition': 'attachment; filename="venues.csv"',
    },
  });
}
