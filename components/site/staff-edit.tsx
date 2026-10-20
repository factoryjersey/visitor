'use client';

import { ImageIcon, Pencil, Tag, X, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { quickEditEvent, quickEditTour, setListingImage, takeOffSite } from '@/app/actions';
import { GENRE_MARKERS, MARKERS } from './category-markers';

/**
 * Staff only: a pencil in the corner of a public page that opens the
 * quick fixes, the picture, the categories, the title, the card sentence
 * and the copy, so a misfiled event is put right where it was spotted.
 * Everything else is on the full admin page it links to.
 */

type Common = { id: string; title: string; summary: string | null; description: string | null; image: { url: string; alt: string | null; stock: boolean } | null; adminHref: string };
type Props =
  | (Common & { kind: 'event'; eventTypes: string[]; allTypes: readonly string[]; printLine: string | null })
  | (Common & { kind: 'experience'; genre: string | null; genres: readonly string[] });

function Save({ label = 'Save' }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-harbour px-4 py-2 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60">
      {pending ? 'Saving…' : label}
    </button>
  );
}

const field = 'w-full rounded border border-harbour/20 px-3 py-2 text-sm focus:border-sea focus:outline-none';
const label = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink/60';
const ICONS = new Map<string, LucideIcon>([...MARKERS, ...(Object.entries(GENRE_MARKERS) as [string, LucideIcon][])]);

/** A picture scaled in the browser to 1920 wide at most, as a JPEG: what the site shows, not what the camera took. */
export async function webSized(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
}

/** One category as a tile: its icon, its name, ticked or not. */
function CategoryTile({ name, value, checked, type }: { name: string; value: string; checked: boolean; type: 'checkbox' | 'radio' }) {
  const Icon = ICONS.get(value) ?? Tag;
  return (
    <label className="cursor-pointer">
      <input type={type} name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="flex h-full flex-col items-center gap-1 rounded-lg border border-harbour/15 px-1 py-2 text-center text-[0.7rem] font-semibold leading-tight text-ink transition peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:text-brand peer-focus-visible:ring-2 peer-focus-visible:ring-sea">
        <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
        {value}
      </span>
    </label>
  );
}

function PictureSection(props: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(props.image?.url ?? null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async (form: FormData) => {
    setMessage(null);
    const file = form.get('file');
    const mode = form.get('mode');
    if (mode === 'upload' && file instanceof File && file.size) form.set('file', await webSized(file));
    const result = await setListingImage(form);
    setMessage(result.ok ? { ok: true, text: mode === 'remove' ? 'Picture removed.' : 'Picture saved.' } : { ok: false, text: result.error });
    if (result.ok) router.refresh();
  };

  return (
    <section className="space-y-3 rounded-lg border border-harbour/10 p-3">
      <p className={label}>Picture</p>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="aspect-[2/1] w-full rounded object-cover" />
      ) : (
        <div className="flex aspect-[2/1] w-full items-center justify-center rounded bg-harbour/5 text-harbour/40"><ImageIcon className="h-8 w-8" /></div>
      )}
      {props.image?.stock && <p className="text-xs text-ink/50">An illustrative stock picture: upload the real one to replace it.</p>}

      <form action={send} className="space-y-2">
        <input type="hidden" name="kind" value={props.kind} />
        <input type="hidden" name="id" value={props.id} />
        <input type="hidden" name="mode" value="upload" />
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPreview(URL.createObjectURL(f));
          }}
          className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-harbour/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink hover:file:bg-harbour/20"
        />
        <input name="alt" placeholder="What it shows (for screen readers)" className={field} defaultValue={props.image?.alt ?? ''} />
        <Save label="Upload picture" />
      </form>

      <details className="text-sm">
        <summary className="cursor-pointer text-sea">Or use a link, or remove it</summary>
        <form action={send} className="mt-2 flex gap-2">
          <input type="hidden" name="kind" value={props.kind} />
          <input type="hidden" name="id" value={props.id} />
          <input type="hidden" name="mode" value="url" />
          <input name="url" type="url" placeholder="https://…" required className={field} />
          <Save label="Use" />
        </form>
        {props.image && (
          <form action={send} className="mt-2">
            <input type="hidden" name="kind" value={props.kind} />
            <input type="hidden" name="id" value={props.id} />
            <input type="hidden" name="mode" value="remove" />
            <button type="submit" className="text-sm font-medium text-brand hover:underline">Remove the picture</button>
          </form>
        )}
      </details>
      {message && <p className={`text-sm ${message.ok ? 'text-emerald-700' : 'text-brand'}`}>{message.text}</p>}
    </section>
  );
}

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
          <div role="dialog" aria-label="Quick edit" onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-ink">Quick edit</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded p-1 hover:bg-harbour/5">
                <X className="h-5 w-5" />
              </button>
            </div>

            <PictureSection {...props} />

            <form action={save} className="mt-5 space-y-5">
              <input type="hidden" name="id" value={props.id} />

              {props.kind === 'event' ? (
                <fieldset>
                  <legend className={label}>Categories</legend>
                  <div className="grid grid-cols-3 gap-1.5">
                    {props.allTypes.map((t) => <CategoryTile key={t} type="checkbox" name="eventTypes" value={t} checked={props.eventTypes.includes(t)} />)}
                  </div>
                </fieldset>
              ) : (
                <fieldset>
                  <legend className={label}>Category</legend>
                  {/* None, unless a tile is chosen: the chosen one comes later in the form and wins. */}
                  <input type="hidden" name="genre" value="" />
                  <div className="grid grid-cols-3 gap-1.5">
                    {props.genres.map((g) => <CategoryTile key={g} type="radio" name="genre" value={g} checked={props.genre === g} />)}
                  </div>
                </fieldset>
              )}

              <div>
                <label className={label} htmlFor="qe-title">Title</label>
                <input id="qe-title" name="title" defaultValue={props.title} required className={field} />
              </div>
              <div>
                <label className={label} htmlFor="qe-summary">Card sentence</label>
                <textarea id="qe-summary" name="summary" defaultValue={props.summary ?? ''} rows={2} className={field} />
              </div>
              {props.kind === 'event' && (
                <div>
                  <label className={label} htmlFor="qe-print-line">Guide snippet</label>
                  <input id="qe-print-line" name="printLine" defaultValue={props.printLine ?? ''} maxLength={200} className={field} />
                  <p className="mt-1 text-xs text-ink/50">Two sentences for the printed guide: the first 80 characters or fewer and able to stand alone, both together 170 or fewer.</p>
                </div>
              )}
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

            <form action={takeOffSite} className="mt-6 border-t border-harbour/10 pt-4">
              <input type="hidden" name="kind" value={props.kind} />
              <input type="hidden" name="id" value={props.id} />
              <button
                type="submit"
                onClick={(e) => !confirm('Take this off the site and out of the guide? You can put it back from its admin page.') && e.preventDefault()}
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
