import { type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth/session';
import { buildPackage, packageNames } from '@/lib/guide-package';
import { drive, driveLink } from '@/lib/integrations/google/drive';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MIME: Record<string, string> = { idml: 'application/vnd.adobe.indesign-idml-package', csv: 'text/csv', txt: 'text/plain', ase: 'application/octet-stream', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', tif: 'image/tiff', tiff: 'image/tiff', jsx: 'text/plain' };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The edition's InDesign package written straight into its Drive folder, as
 * the connected account: a folder named for the edition, Links/ inside it,
 * each file replacing the one of the same name from an export before. The
 * page shows each file as it goes, which also keeps the connection open
 * through Cloudflare while the pictures upload.
 */
export async function POST(request: NextRequest) {
  await requireStaff();
  const sp = request.nextUrl.searchParams;
  const link = await driveLink();
  const d = await drive();
  const head = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sending to Drive</title><body style="font:14px/1.5 system-ui,sans-serif;margin:24px;max-width:46rem;color:#1c1917;background:#fff">';
  if (!d || !link?.folderId) {
    return new Response(`${head}<p>Connect Google Drive and choose its folder on the guide’s page first.</p><p><a href="/admin/guide">Back to the guide</a></p>`, { status: 409, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  const { job } = packageNames(sp);
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const say = (html: string) => controller.enqueue(enc.encode(html));
      say(`${head}<h1 style="font-size:18px">Sending ${esc(job)} to Drive${link.email ? ` as ${esc(link.email)}` : ''}</h1><ol style="font-size:13px;color:#57534e">`);
      let sent = 0;
      const failed: string[] = [];
      try {
        const root = await d.folder(job, link.folderId!);
        const result = await buildPackage(sp, async (path, bytes) => {
          const parts = path.split('/');
          const name = parts.pop()!;
          let parent = root;
          for (const dir of parts) parent = await d.folder(dir, parent);
          try {
            await d.put(name, parent, bytes, MIME[name.split('.').pop()!.toLowerCase()] ?? 'application/octet-stream');
            sent += 1;
            say(`<li>${esc(path)}</li>`);
          } catch (e) {
            failed.push(`${path}: ${(e as Error).message}`);
            say(`<li style="color:#b91c1c">${esc(path)}: ${esc((e as Error).message)}</li>`);
          }
        });
        say(`</ol><p><strong>${sent} files in Drive</strong>, in the folder ${esc(job)}${result.missing ? `; ${result.missing} of ${result.pictures} pictures could not be fetched (README.txt lists them)` : ''}${failed.length ? `; ${failed.length} did not upload (above)` : ''}.</p><p><a href="https://drive.google.com/drive/folders/${encodeURIComponent(root)}" target="_blank" rel="noopener">Open the folder in Drive</a> · <a href="/admin/guide">Back to the guide</a></p>`);
      } catch (e) {
        say(`</ol><p style="color:#b91c1c"><strong>Stopped:</strong> ${esc((e as Error).message)}</p><p><a href="/admin/guide">Back to the guide</a></p>`);
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } });
}
