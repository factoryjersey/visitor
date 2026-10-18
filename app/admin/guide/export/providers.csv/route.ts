import { type NextRequest } from 'next/server';
import { toCsv, utf16le } from '@/lib/domain/csv';
import { PROVIDER_COLUMNS, buildGuide, windowFrom } from '@/lib/guide';

/** The provider key for the tours pages: only providers with a tour in this edition. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const window = windowFrom({ from: sp.get('from') ?? undefined, to: sp.get('to') ?? undefined });
  const { providers } = await buildGuide(window);
  const csv = toCsv(PROVIDER_COLUMNS, providers.map((p) => [p.code, p.name, p.contact, p.website]));
  return new Response(utf16le(csv), {
    headers: { 'Content-Type': 'text/csv; charset=utf-16le', 'Content-Disposition': `attachment; filename="tour_providers_${window.from}_${window.to}.csv"` },
  });
}
