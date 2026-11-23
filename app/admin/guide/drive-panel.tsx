import { driveConfigured, driveLink } from '@/lib/integrations/google/drive';
import { disconnectDrive, saveDriveFolder } from './drive/actions';

/**
 * The package straight into Drive: connect the Google account once, choose
 * the edition's working folder, then send. Each send writes a folder named
 * for the edition, replacing the files of an earlier send.
 */
export async function DrivePanel({ query, back, note }: { query: string; back: string; note?: string }) {
  if (!driveConfigured()) {
    return <span className="self-center text-xs text-stone-500" title="Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in Railway to send the package straight to Drive">Drive: not set up</span>;
  }
  const link = await driveLink();
  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2 text-xs">
      {note && <span className="mr-auto rounded bg-amber-50 px-2 py-1 text-amber-900">{note}</span>}
      {!link ? (
        <a href="/admin/guide/drive/connect" className="rounded border border-stone-300 px-3 py-1 text-sm hover:bg-stone-100">Connect Google Drive</a>
      ) : (
        <>
          <span className="text-stone-500">Drive{link.email ? ` (${link.email})` : ''}:</span>
          <form action={saveDriveFolder} className="flex items-center gap-1">
            <input type="hidden" name="back" value={back} />
            <input name="folder" defaultValue={link.folderId ? `https://drive.google.com/drive/folders/${link.folderId}` : ''} placeholder="The working folder’s link" className="w-64 rounded border border-stone-300 px-2 py-1" />
            <button className="rounded border border-stone-300 px-2 py-1 hover:bg-stone-100">{link.folderId ? 'Change folder' : 'Use this folder'}</button>
          </form>
          {link.folderId && (
            <form action={`/admin/guide/export/drive?${query}`} method="post" target="_blank">
              <button className="rounded border border-stone-300 bg-stone-50 px-3 py-1 text-sm font-medium hover:bg-stone-100" title="The package written straight into the working folder, in a folder named for the edition">Send package to Drive</button>
            </form>
          )}
          <form action={disconnectDrive}>
            <input type="hidden" name="back" value={back} />
            <button className="text-stone-500 underline hover:text-stone-800">Disconnect</button>
          </form>
        </>
      )}
    </div>
  );
}

/**
 * One section at a time, from the page staff set for it: What's On, Tours, or
 * a venue section, as its own document with its pictures, downloaded or sent
 * into the edition's folder in Drive beside any sent before.
 */
export async function SectionExport({ query, sections }: { query: string; sections: string[] }) {
  const link = driveConfigured() ? await driveLink() : null;
  const hidden = [...new URLSearchParams(query).entries()];
  return (
    <form method="get" action="/admin/guide/export/package.zip" className="flex flex-wrap items-center gap-2 text-xs">
      {hidden.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <span className="text-stone-500">One section:</span>
      <select name="section" className="rounded border border-stone-300 px-2 py-1">
        {sections.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <label className="flex items-center gap-1 text-stone-600">from page <input type="number" name="start" min={1} max={400} placeholder="as laid" className="w-16 rounded border border-stone-300 px-2 py-1" /></label>
      <button className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100" title="That section's InDesign document and its pictures, in a zip">InDesign</button>
      <button formAction="/admin/guide" formTarget="_blank" name="pdf" value="section" className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100" title="That section as a print PDF, its pages numbered from the start page">PDF</button>
      {link?.folderId && (
        <button formAction={`/admin/guide/export/drive?${query}`} formMethod="post" formTarget="_blank" className="rounded border border-stone-300 bg-stone-50 px-3 py-1 hover:bg-stone-100" title="That section's InDesign document and its pictures, into the edition's folder in Drive">Send to Drive</button>
      )}
    </form>
  );
}
