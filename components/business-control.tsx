import { asc } from 'drizzle-orm';
import { setListingBusiness } from '@/app/admin/people/actions';
import { db } from '@/lib/db';
import { businesses, type ListingKind, type Review } from '@/lib/db/schema';

const REVIEW_TEXT: Record<Review, string> = {
  pending: 'Sent by its business and waiting in Review.',
  rejected: 'Turned down in review. Hidden until its business sends it again.',
  approved: '',
};

/** Which business looks after a listing: its people can edit it, through review. */
export async function BusinessControl({ kind, id, businessId, review }: { kind: ListingKind; id: string; businessId: string | null; review: Review }) {
  const all = await db.select({ id: businesses.id, name: businesses.name }).from(businesses).orderBy(asc(businesses.name));
  return (
    <div className="rounded border border-stone-200 bg-white p-3">
      <h2 className="mb-2 text-sm font-medium">Looked after by</h2>
      {review !== 'approved' && <p className="mb-2 text-xs text-amber-700">{REVIEW_TEXT[review]}</p>}
      <form action={setListingBusiness} className="flex gap-2">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <select name="businessId" defaultValue={businessId ?? ''} className="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1 text-sm">
          <option value="">Nobody: only us</option>
          {all.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button type="submit" className="rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100">Set</button>
      </form>
    </div>
  );
}
