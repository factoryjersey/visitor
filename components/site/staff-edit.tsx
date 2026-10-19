'use client';

import { Pencil, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { quickEditEvent, quickEditTour, setInclusion } from '@/app/actions';

/**
 * Staff only: a pencil in the corner of a public page that opens the
 * quick fixes, the title, the card sentence, the copy and the kinds, so a
 * misfiled event is put right where it was spotted. Everything else is on
 * the full admin page it links to.
 */

type Common = { id: string; title: string; summary: string | null; description: string | null; adminHref: string };
type Props =
  | (Common & { kind: 'event'; eventTypes: string[]; allTypes: readonly string[] })
  | (Common & { kind: 'experience'; genre: string | null; genres: readonly string[] });

function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-harbour px-4 py-2 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60">
      {pending ? 'Saving…' : 'Save'}
    </button>
  );
}

const field = 'w-full rounded border border-harbour/20 px-3 py-2 text-sm focus:border-sea focus:outline-none';
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/60';

export function StaffEdit(props: Props) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const save = async (form: FormData) => {
    await (props.kind === 'event' ? quickEditEvent(form) : quickEditTour(form));
    setSaved(true);
    setOpen(false);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-harbour px-4 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-white/20 hover:bg-brand"
      >
        <Pencil aria-hidden="true" className="h-4 w-4" />
        {saved ? 'Saved' : 'Edit'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="Quick edit"
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-ink">Quick edit</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded p-1 hover:bg-harbour/5">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={save} className="space-y-4">
              <input type="hidden" name="id" value={props.id} />
              <div>
                <label className={label} htmlFor="qe-title">Title</label>
                <input id="qe-title" name="title" defaultValue={props.title} required className={field} />
              </div>

              {props.kind === 'event' ? (
                <fieldset>
                  <legend className={label}>Kinds of event</legend>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {props.allTypes.map((t) => (
                      <label key={t} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="eventTypes" value={t} defaultChecked={props.eventTypes.includes(t)} className="accent-brand" />
                        {t}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <div>
                  <label className={label} htmlFor="qe-genre">Kind of tour</label>
                  <select id="qe-genre" name="genre" defaultValue={props.genre ?? ''} className={field}>
                    <option value="">None</option>
                    {props.genres.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className={label} htmlFor="qe-summary">Card sentence</label>
                <textarea id="qe-summary" name="summary" defaultValue={props.summary ?? ''} rows={2} className={field} />
              </div>
              <div>
                <label className={label} htmlFor="qe-description">Description</label>
                <textarea id="qe-description" name="description" defaultValue={props.description ?? ''} rows={9} className={field} />
              </div>
              <p className="text-xs text-ink/50">What you change here stays as you set it: the next import leaves it alone.</p>
              <div className="flex items-center justify-between gap-3">
                <Save />
                <Link href={props.adminHref} className="text-sm text-sea hover:text-brand">Everything else →</Link>
              </div>
            </form>

            <form action={setInclusion} className="mt-6 border-t border-harbour/10 pt-4">
              <input type="hidden" name="kind" value={props.kind} />
              <input type="hidden" name="id" value={props.id} />
              <input type="hidden" name="inclusion" value="excluded" />
              <button
                type="submit"
                onClick={(e) => !confirm('Take this off the site and out of the guide?') && e.preventDefault()}
                className="text-sm font-medium text-brand hover:underline"
              >
                Take it off the site
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
