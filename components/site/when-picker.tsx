'use client';

import { CalendarDays } from 'lucide-react';
import { useRef, useState } from 'react';
import { addDays, WHEN_PICKS } from '@/lib/domain/when';

/**
 * When: the quick picks visitors reach for first, as chips that apply as
 * soon as they are tapped, and Choose dates for any two days. The dates are
 * the browser's own date inputs, so a phone opens its own calendar; they
 * apply with the form's Show button, as typing a date would otherwise
 * reload the page halfway through the year.
 */
export function WhenPicker(props: { when?: string; from?: string; to?: string; today: string }) {
  const [chosen, setChosen] = useState(props.when ?? (props.from || props.to ? 'dates' : ''));
  const [from, setFrom] = useState(props.from ?? '');
  const fromInput = useRef<HTMLInputElement>(null);

  const choose = (value: string, e: React.ChangeEvent<HTMLInputElement>) => {
    setChosen(value);
    const form = e.currentTarget.form;
    if (value === 'dates') requestAnimationFrame(() => fromInput.current?.focus());
    else requestAnimationFrame(() => form?.requestSubmit());
  };

  const chip = (value: string, label: React.ReactNode) => (
    <label key={value} className="cursor-pointer">
      <input type="radio" name="when" value={value} checked={chosen === value} onChange={(e) => choose(value, e)} className="peer sr-only" />
      <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm ring-1 ring-harbour/15 transition-colors hover:ring-brand/40 peer-checked:bg-harbour peer-checked:text-white peer-checked:ring-harbour peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sea">
        {label}
      </span>
    </label>
  );

  return (
    <fieldset className="w-full">
      <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-harbour/60">When</legend>
      <div className="flex flex-wrap gap-2">
        {chip('', 'Any time')}
        {WHEN_PICKS.map((w) => chip(w.value, w.label))}
        {chip(
          'dates',
          <>
            <CalendarDays aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
            Choose dates
          </>,
        )}
      </div>
      {chosen === 'dates' && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-xs text-harbour/60">From</span>
            <input
              ref={fromInput}
              type="date"
              name="from"
              min={props.today}
              defaultValue={props.from}
              onChange={(e) => setFrom(e.currentTarget.value)}
              className="w-full rounded border border-harbour/20 bg-white px-3 py-2"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-xs text-harbour/60">To</span>
            <input type="date" name="to" min={from || props.today} max={addDays(props.today, 730)} defaultValue={props.to} className="w-full rounded border border-harbour/20 bg-white px-3 py-2" />
          </label>
        </div>
      )}
    </fieldset>
  );
}
