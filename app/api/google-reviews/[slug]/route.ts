import { NextResponse } from 'next/server';
import { publicVenue } from '@/lib/db/public';
import { googleConfigured, placeReviews } from '@/lib/integrations/google/places';

/**
 * A venue's Google rating and reviews, fetched from Google for the visitor
 * looking and never kept: Google's terms allow storing only the place ID.
 * The panel asks for this when it scrolls into view, so crawlers do not.
 */
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const venue = await publicVenue((await params).slug);
  if (!venue?.googlePlaceId || !googleConfigured()) return NextResponse.json({ error: 'none' }, { status: 404, headers: { 'cache-control': 'no-store' } });
  try {
    return NextResponse.json(await placeReviews(venue.googlePlaceId), { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 502, headers: { 'cache-control': 'no-store' } });
  }
}
