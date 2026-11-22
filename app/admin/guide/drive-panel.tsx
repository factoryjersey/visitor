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
