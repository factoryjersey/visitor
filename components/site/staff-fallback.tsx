'use client';

import { ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { setFallbackImage } from '@/app/actions';
import { webSized } from './staff-edit';

/**
 * Staff only, on an organiser's or venue's page: the picture their events
 * show when they come without one. It replaces stock photographs at once;
 * an event's own picture, or one a person chose, always wins.
 */

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-harbour px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60">
      {pending ? 'Saving…' : label}
    </button>
  );
}

const field = 'w-full rounded border border-harbour/20 px-3 py-1.5 text-sm focus:border-sea focus:outline-none';

export function StaffFallback({ kind, id, name, image }: { kind: 'organiser' | 'venue'; id: string; name: string; image: { url: string; alt: string | null } | null }) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(image?.url ?? null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async (form: FormData) => {
    setMessage(null);
    const file = form.get('file');
    const mode = form.get('mode');
    if (mode === 'upload' && file instanceof File && file.size) form.set('file', await webSized(file));
    const r = await setFallbackImage(form);
    if (!r.ok) return setMessage({ ok: false, text: r.error });
    if (mode === 'remove') setPreview(null);
    setMessage({ ok: true, text: `${mode === 'remove' ? 'Fallback removed' : 'Fallback saved'}: ${r.changed} event${r.changed === 1 ? '' : 's'} updated.` });
    router.refresh();
  };
  const hidden = (mode: string) => (
    <>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="mode" value={mode} />
    </>
  );

  return (
    <details className="mb-8 rounded-lg border border-dashed border-harbour/25 p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-ink">Staff: fallback picture for {name}&rsquo;s events</summary>
      <p className="mt-2 text-xs text-ink/60">
        Shown on {kind === 'organiser' ? 'their' : 'its'} events that come without a picture, in place of a stock photograph.
        {kind === 'venue' && ' An organiser’s fallback comes first.'} An event&rsquo;s own picture always wins.
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-[240px_1fr]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="aspect-[2/1] w-full rounded object-cover" />
        ) : (
          <div className="flex aspect-[2/1] w-full items-center justify-center rounded bg-harbour/5 text-harbour/40"><ImageIcon className="h-8 w-8" /></div>
        )}
        <div className="space-y-3">
          <form action={send} className="space-y-2">
            {hidden('upload')}
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
            <input name="alt" placeholder="What it shows (for screen readers)" defaultValue={image?.alt ?? ''} className={field} />
            <Save label="Upload fallback" />
          </form>
          <form action={send} className="flex gap-2">
            {hidden('url')}
            <input name="url" type="url" placeholder="Or a link: https://…" required className={field} />
            <Save label="Use" />
          </form>
          {image && (
            <form action={send}>
              {hidden('remove')}
              <button type="submit" className="text-sm font-medium text-brand hover:underline">Remove the fallback</button>
            </form>
          )}
          {message && <p className={message.ok ? 'text-emerald-700' : 'text-brand'}>{message.text}</p>}
        </div>
      </div>
    </details>
  );
}
