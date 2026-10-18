import clsx from '@/lib/clsx';
import { setInclusion } from '@/app/actions';
import type { Inclusion } from '@/lib/db/schema';

const LABEL: Record<Inclusion, string> = { candidate: 'Undecided', included: 'In the guide', excluded: 'Left out' };

export function InclusionBadge({ inclusion }: { inclusion: Inclusion }) {
  return (
    <span
      className={clsx(
        'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
        inclusion === 'included' && 'bg-emerald-100 text-emerald-800',
        inclusion === 'excluded' && 'bg-stone-200 text-stone-600',
        inclusion === 'candidate' && 'bg-amber-100 text-amber-800',
      )}
    >
      {LABEL[inclusion]}
    </span>
  );
}

/** Include / Leave out, as plain forms so they work without client JavaScript. */
export function InclusionControl({ kind, id, inclusion }: { kind: 'event' | 'venue'; id: string; inclusion: Inclusion }) {
  const button = (to: Inclusion, text: string, style: string) => (
    <form action={setInclusion}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="inclusion" value={to} />
      <button type="submit" className={clsx('rounded border px-2 py-1 text-xs', style)}>{text}</button>
    </form>
  );
  return (
    <div className="flex gap-1">
      {inclusion !== 'included' && button('included', 'Include', 'border-emerald-600 text-emerald-700 hover:bg-emerald-50')}
      {inclusion !== 'excluded' && button('excluded', 'Leave out', 'border-stone-300 text-stone-600 hover:bg-stone-100')}
      {inclusion !== 'candidate' && button('candidate', 'Undo', 'border-transparent text-stone-500 hover:underline')}
    </div>
  );
}
