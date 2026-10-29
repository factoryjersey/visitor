import { revalidatePath } from 'next/cache';
import { forget } from '@/lib/cache';

/** After staff change a listing: the public listings are read afresh, and every page shows the change at once. */
export function refreshSite() {
  forget('public:');
  revalidatePath('/', 'layout');
}
