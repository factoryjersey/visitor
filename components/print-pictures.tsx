'use client';

import { useMemo, useState } from 'react';
import { setPrintPicture } from '@/app/actions';
import { matchPicture } from '@/lib/domain/print-picture';
import { webSized } from './site/staff-edit';

type Venue = { id: string; name: string; slug: string; section: string; picture: string | null; fromPrint: boolean };
type Row = { key: string; file: File; preview: string; venueId: string; tied: string[]; state: 'ready' | 'saving' | 'saved' | 'error'; message?: string };

/** What a browser can show and scale; InDesign also links Photoshop and TIFF files, which need saving as JPEG first. */
const usable = (f: File) => /^image\/(jpeg|png|webp)$/.test(f.type);

/**
 * Staff drop the printed guide's pictures here: each is matched to a
 * venue by its file name, shown beside the venue's picture now, and
 * saved, one at a time, once a person has looked.
 */
export function PrintPictures({ venues }: { venues: Venue[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const byId = useMemo(() => new Map(venues.map((v) => [v.id, v])), [venues]);

  const add = (files: FileList | null) => {
    if (!files) return;
    const list = [...files];
    setSkipped((s) => [...s, ...list.filter((f) => !usable(f)).map((f) => f.name)]);
    const fresh = list.filter(usable).map((file): Row => {
      const m = matchPicture(file.name, venues);
      return { key: `${file.name}-${file.size}-${file.lastModified}`, file, preview: URL.createObjectURL(file), venueId: m.venue?.id ?? '', tied: m.tied.map((v) => v.id), state: 'ready' };
    });
    setRows((r) => [...r, ...fresh.filter((f) => !r.some((x) => x.key === f.key))]);
  };

  const set = (key: string, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const saveAll = async () => {
    setBusy(true);
    for (const row of rows.filter((r) => r.venueId && r.state !== 'saved')) {
      set(row.key, { state: 'saving', message: undefined });
      const form = new FormData();
      form.set('id', row.venueId);
      form.set('filename', row.file.name);
      form.set('file', await webSized(row.file));
      const r = await setPrintPicture(form).catch((e: Error) => ({ ok: false as const, error: e.message }));
      set(row.key, r.ok ? { state: 'saved' } : { state: 'error', message: r.error });
    }
    setBusy(false);
  };

  const ready = rows.filter((r) => r.venueId && r.state !== 'saved').length;

  return (
    <div className="space-y-6">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center text-sm ${over ? 'border-sky-500 bg-sky-50' : 'border-stone-300 bg-white'}`}
      >
        <span className="font-semibold text-stone-800">Drop pictures here, or choose them</span>
        <span className="mt-1 text-stone-500">JPEG, PNG or WebP. Photoshop and TIFF files need saving as JPEG first.</span>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => add(e.target.files)} />
      </label>

      {skipped.length > 0 && <p className="text-sm text-amber-700">Left out, not JPEG, PNG or WebP: {skipped.join(', ')}</p>}

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-600">
              {rows.length} pictures · {rows.filter((r) => r.venueId).length} matched · {rows.filter((r) => r.state === 'saved').length} saved
            </p>
            <button type="button" disabled={busy || !ready} onClick={saveAll} className="rounded bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? 'Saving…' : `Save ${ready} picture${ready === 1 ? '' : 's'}`}
            </button>
          </div>
          <ul className="divide-y divide-stone-200 rounded border border-stone-200 bg-white">
            {rows.map((r) => {
              const v = byId.get(r.venueId);
              return (
                <li key={r.key} className="flex flex-wrap items-center gap-4 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.preview} alt="" className="h-20 w-28 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-stone-500" title={r.file.name}>{r.file.name}</p>
                    <select
                      value={r.venueId}
                      disabled={r.state === 'saving' || r.state === 'saved'}
                      onChange={(e) => set(r.key, { venueId: e.target.value, state: 'ready', message: undefined })}
                      className="mt-1 w-full max-w-md rounded border border-stone-300 px-2 py-1.5 text-sm"
                    >
                      <option value="">{r.tied.length ? `Which? ${r.tied.map((id) => byId.get(id)?.name).join(' or ')}` : 'No venue: choose one'}</option>
                      {r.tied.map((id) => (
                        <option key={`t-${id}`} value={id}>{byId.get(id)?.name} ({byId.get(id)?.section})</option>
                      ))}
                      {venues.map((x) => (
                        <option key={x.id} value={x.id}>{x.name} ({x.section})</option>
                      ))}
                    </select>
                    {r.state === 'error' && <p className="mt-1 text-sm text-red-700">{r.message}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    {v?.picture ? (
                      <>
                        <span>{v.fromPrint ? 'Replaces print picture' : 'Now'}</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.picture} alt="" className="h-12 w-16 rounded object-cover opacity-70" />
                      </>
                    ) : (
                      v && <span>No picture now</span>
                    )}
                  </div>
                  <span className={`w-16 text-right text-xs font-semibold ${r.state === 'saved' ? 'text-emerald-700' : r.state === 'error' ? 'text-red-700' : 'text-stone-400'}`}>
                    {r.state === 'saved' ? 'Saved' : r.state === 'saving' ? 'Saving…' : r.state === 'error' ? 'Failed' : ''}
                  </span>
                  {v && <a href={`/venues/${v.slug}`} target="_blank" rel="noopener" className="text-xs text-sky-700 hover:underline">View</a>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
