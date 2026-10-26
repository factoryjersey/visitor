import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { places } from '@/lib/db/schema';
import { CATEGORY_LABEL } from '@/lib/params';
import { PrintPictures } from '@/components/print-pictures';

export const dynamic = 'force-dynamic';

/** Pictures from the printed guide's InDesign links, put on their venues in one go. */
export default async function PicturesPage() {
  const rows = await db
    .select({ id: places.id, name: places.name, slug: places.slug, category: places.category, headerImage: places.headerImage, sources: places.fieldSources })
    .from(places)
    .where(eq(places.review, 'approved'))
    .orderBy(asc(places.name));
  const venues = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    section: CATEGORY_LABEL[r.category],
    picture: r.headerImage?.url ?? null,
    fromPrint: r.sources.headerImage?.source === 'print',
  }));
  return (
    <>
      <h1 className="mb-1 font-display text-2xl">Pictures from the printed guide</h1>
      <p className="mb-6 max-w-3xl text-sm text-stone-600">
        Drop the pictures from the InDesign files&rsquo; Links folder here. Each is matched to a venue by its file name; check the matches, change any
        that are wrong, and save. A picture saved here leads the venue&rsquo;s page and its story, ahead of Visit Jersey&rsquo;s, and the import leaves it alone.
        {' '}{venues.filter((v) => v.fromPrint).length} venues have one so far.
      </p>
      <PrintPictures venues={venues} />
    </>
  );
}
