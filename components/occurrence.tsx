import clsx from '@/lib/clsx';
import { setOccurrence } from '@/app/actions';
import { OCCURRENCES, OCCURRENCE_LABEL, UNIQUE, type Occurrence } from '@/lib/domain/occurrence';

export function OccurrenceBadge({ occurrence, onDemand }: { occurrence: Occurrence; onDemand?: boolean }) {
  const unique = UNIQUE.includes(occurrence);
  const label = onDemand && occurrence === 'ongoing' ? 'On demand' : OCCURRENCE_LABEL[occurrence];
  return (
    <span className={clsx('inline-block rounded px-1.5 py-0.5 text-[11px] font-medium', unique ? 'bg-sky-100 text-sky-800' : 'bg-stone-100 text-stone-500')}>
      {label}
    </span>
  );
}

/** Correct the call the dates made. The choice is locked against the next import. */
export function OccurrenceControl({ kind, id, occurrence, locked, onDemand }: { kind: 'event' | 'experience'; id: string; occurrence: Occurrence; locked: boolean; onDemand?: boolean }) {
  return (
    <form action={setOccurrence} className="space-y-1">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <label className="block">
        <span className="text-sm font-medium">Kind</span>
        <span className="ml-2 text-xs text-stone-500">{locked ? 'Set by hand' : 'Worked out from the dates'}</span>
        <div className="mt-1 flex gap-2">
          <select name="occurrence" defaultValue={occurrence} className="flex-1 rounded border border-stone-300 p-1.5 text-sm">
            {OCCURRENCES.map((o) => (
              <option key={o} value={o}>{onDemand && o === 'ongoing' ? 'On demand' : OCCURRENCE_LABEL[o]}</option>
            ))}
          </select>
          <button type="submit" className="rounded border border-stone-300 px-3 text-sm hover:bg-stone-100">Set</button>
        </div>
      </label>
    </form>
  );
}
