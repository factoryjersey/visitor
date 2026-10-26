import { NextResponse, type NextRequest } from 'next/server';
import { asKind } from '@/lib/domain/search';
import { runSearch, trimHits } from '@/lib/search';
import { many } from '@/lib/params';

export const dynamic = 'force-dynamic';

/**
 * What the search panel asks as the visitor types and taps: the same
 * parameters as /search (q, when, from, to, kind, cat), answered with the
 * counts and the first few results of each kind, or the first page of one.
 */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const val = (k: string) => p.get(k)?.trim() || undefined;
  const kind = asKind(val('kind'));
  const answer = await runSearch({ q: val('q')?.slice(0, 120), kind, when: val('when'), from: val('from'), to: val('to'), cats: many(p.getAll('cat')).slice(0, 12) });
  return NextResponse.json({ ...answer, hits: trimHits(answer.hits, kind, 60, 4) }, { headers: { 'Cache-Control': 'no-store' } });
}
