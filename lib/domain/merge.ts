import type { FieldSource, FieldSources } from '@/lib/db/schema';

/**
 * Applying one source's values to a canonical record.
 *
 * Three rules, in order:
 *  1. A locked field is a person's correction and is never written.
 *  2. A source that has nothing to say about a field leaves it alone,
 *     unless the current value came from that same source record, in
 *     which case the source has withdrawn it and the field is cleared.
 *  3. Otherwise the source's value is written and the field's
 *     provenance becomes that source.
 *
 * Pure, so the importer can be wrong only about fetching and storing.
 */

export type MergeResult<T> = {
  patch: Partial<T>;
  fieldSources: FieldSources;
  changed: string[];
};

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
}

/** JSON with object keys sorted. Postgres stores jsonb keys in its own order, so a plain stringify calls equal values different. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v instanceof Date) return JSON.stringify(v.toISOString());
  if (v !== null && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

function same(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

export function mergeFromSource<T extends Record<string, unknown>>(
  current: Partial<T> | null,
  incoming: Partial<T>,
  opts: { locked: readonly string[]; fieldSources: FieldSources; stamp: FieldSource },
): MergeResult<T> {
  const patch: Partial<T> = {};
  const fieldSources: FieldSources = { ...opts.fieldSources };
  const changed: string[] = [];
  const fromThisRecord = (k: string) =>
    fieldSources[k]?.source === opts.stamp.source && fieldSources[k]?.ref === opts.stamp.ref;

  for (const key of Object.keys(incoming) as (keyof T & string)[]) {
    if (opts.locked.includes(key)) continue;
    const next = incoming[key];
    const now = current?.[key];

    if (isEmpty(next)) {
      if (!isEmpty(now) && fromThisRecord(key)) {
        patch[key] = (Array.isArray(now) ? [] : null) as T[typeof key];
        delete fieldSources[key];
        changed.push(key);
      }
      continue;
    }
    if (!same(now, next)) {
      patch[key] = next;
      changed.push(key);
    }
    if (!same(now, next) || fieldSources[key] === undefined) {
      fieldSources[key] = opts.stamp;
    }
  }
  return { patch, fieldSources, changed };
}
