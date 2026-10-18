'use client';

import { useActionState } from 'react';
import type { ListingKind } from '@/lib/db/schema';
import { saveListingAction, type SaveState } from '@/app/account/actions';

export type FormDefaults = Record<string, string | boolean>;

type Field = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'checkbox' | 'dates' | 'email' | 'url' | 'tel';
  hint?: string;
  required?: boolean;
  rows?: number;
  wide?: boolean;
};

const CONTACT: Field[] = [
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'email', label: 'Public email', type: 'email', hint: 'For enquiries. Shown to visitors.' },
  { name: 'website', label: 'Website', type: 'url', wide: true },
];

const COPY: Field[] = [
  { name: 'summary', label: 'Summary', type: 'textarea', rows: 3, hint: 'One sentence for listing cards. We write it from your description if you leave it blank.', wide: true },
  { name: 'description', label: 'Description', type: 'textarea', rows: 8, hint: 'Write it however you like: we put it in the guide’s voice (the third person) when you save.', wide: true },
];

const DATES: Field = {
  name: 'dates',
  label: 'Dates',
  type: 'dates',
  required: true,
  wide: true,
  hint: 'One a line: 2026-11-14, or with times, 2026-11-14 19:30 or 2026-11-14 19:30-22:00.',
};

const PRICES: Field[] = [
  { name: 'fromPricePence', label: 'Price from (£)', hint: 'Blank if not charged or not known.' },
  { name: 'toPricePence', label: 'Price to (£)' },
];

const FIELDS: Record<ListingKind, Field[]> = {
  venue: [
    { name: 'name', label: 'Name', required: true, wide: true },
    { name: 'category', label: 'Type', type: 'select', required: true },
    { name: 'addressLine1', label: 'Address', wide: true },
    { name: 'addressLine2', label: 'Address, line 2', wide: true },
    { name: 'parish', label: 'Parish' },
    { name: 'postcode', label: 'Postcode' },
    ...CONTACT,
    ...COPY,
  ],
  event: [
    { name: 'title', label: 'Title', required: true, wide: true },
    DATES,
    { name: 'placeId', label: 'At one of your venues', type: 'select', wide: true },
    { name: 'venueName', label: 'Or, where', hint: 'The venue’s name, if it isn’t one of yours.', wide: true },
    { name: 'addressLine1', label: 'Address', wide: true },
    { name: 'parish', label: 'Parish' },
    { name: 'postcode', label: 'Postcode' },
    ...PRICES,
    { name: 'free', label: 'Free entry', type: 'checkbox', wide: true },
    ...CONTACT,
    ...COPY,
  ],
  experience: [
    { name: 'title', label: 'Title', required: true, wide: true },
    DATES,
    { name: 'duration', label: 'Duration', hint: 'e.g. 2 hours' },
    { name: 'meetingPoint', label: 'Meeting point', wide: true },
    { name: 'parish', label: 'Parish' },
    ...PRICES,
    ...CONTACT,
    ...COPY,
  ],
};

const input = 'w-full rounded border border-stone-300 px-3 py-2 text-sm';

export function ListingForm({
  kind,
  id,
  defaults,
  options,
  parishes,
  submitLabel,
}: {
  kind: ListingKind;
  id?: string;
  defaults: FormDefaults;
  /** Choices for select fields, by field name. */
  options: Record<string, { value: string; label: string }[]>;
  parishes: readonly string[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(saveListingAction, null);
  const value = (name: string) => (state?.values?.[name] ?? defaults[name] ?? '') as string;
  const errors = state && !state.ok ? state.errors : {};

  return (
    // Keyed by the submission, so the fields remount with what was sent rather than resetting to the saved values.
    <form key={state?.at ?? 0} action={formAction} className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <input type="hidden" name="kind" value={kind} />
      {id && <input type="hidden" name="id" value={id} />}
      <datalist id="parishes">{parishes.map((p) => <option key={p} value={p} />)}</datalist>

      {FIELDS[kind].map((f) => {
        const err = errors[f.name];
        const common = { name: f.name, required: f.required, 'aria-invalid': !!err || undefined };
        let control: React.ReactNode;
        if (f.type === 'textarea' || f.type === 'dates') {
          control = <textarea {...common} rows={f.rows ?? 5} defaultValue={value(f.name)} className={`${input} ${f.type === 'dates' ? 'font-mono' : ''}`} />;
        } else if (f.type === 'select') {
          control = (
            <select {...common} defaultValue={value(f.name)} className={input}>
              {!f.required && <option value="">—</option>}
              {(options[f.name] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          );
        } else if (f.type === 'checkbox') {
          const checked = state?.values ? state.values[f.name] === 'on' : defaults[f.name] === true;
          control = <input type="checkbox" name={f.name} defaultChecked={checked} className="h-4 w-4" />;
        } else {
          control = (
            <input
              {...common}
              type={f.type === 'url' ? 'text' : f.type ?? 'text'}
              inputMode={f.type === 'url' ? 'url' : undefined}
              list={f.name === 'parish' ? 'parishes' : undefined}
              defaultValue={value(f.name)}
              className={input}
            />
          );
        }
        return (
          <label key={f.name} className={`block ${f.wide ? 'sm:col-span-2' : ''} ${f.type === 'checkbox' ? 'flex items-center gap-2 self-end' : ''}`}>
            <span className={`text-xs font-medium text-stone-600 ${f.type === 'checkbox' ? '' : 'mb-1 block'}`}>
              {f.label}
              {f.required && <span className="text-red-600"> *</span>}
            </span>
            {control}
            {f.hint && !err && <span className="mt-1 block text-xs text-stone-500">{f.hint}</span>}
            {err && <span className="mt-1 block text-xs text-red-700">{err}</span>}
          </label>
        );
      })}

      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pending ? 'Saving…' : submitLabel}
        </button>
        {state && !state.ok && <span className="text-sm text-red-700">{state.message ?? 'Check the fields marked.'}</span>}
        {state?.ok && <span className="text-sm text-emerald-700">{state.message}</span>}
      </div>
    </form>
  );
}
