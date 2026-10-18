import Link from 'next/link';
import { VenueMap, type MapPoint } from '@/components/venue-map';
import { mapPoints } from '@/lib/db/queries';
import { one, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';

export default async function MapPage({ searchParams }: { searchParams: SearchParams }) {
  const includedOnly = one((await searchParams).included) === '1';
  const rows = await mapPoints({ includedOnly });
  const points: MapPoint[] = rows.map((r) => ({
    slug: r.slug, name: r.name, lat: r.lat!, lon: r.lon!, included: r.inclusion === 'included', eventCount: r.eventCount,
  }));

  return (
    <>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="font-serif text-2xl">Map</h1>
        <Link href={includedOnly ? '/map' : '/map?included=1'} className="text-sm text-stone-600 hover:underline">
          {includedOnly ? 'Show every event venue' : 'Show only venues in the guide'}
        </Link>
      </div>
      <VenueMap points={points} />
      <p className="mt-2 text-sm text-stone-500">{points.length} venues · green is in the guide</p>
    </>
  );
}
