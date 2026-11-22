import { type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth/session';
import { buildPackage, packageNames } from '@/lib/guide-package';
import { ZipWriter } from '@/lib/zip';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** The edition's InDesign package, in one zip, built and sent as it goes. */
export async function GET(request: NextRequest) {
  await requireStaff();
  const sp = request.nextUrl.searchParams;
  const { job } = packageNames(sp);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const zip = new ZipWriter((c) => controller.enqueue(c));
      await buildPackage(sp, (path, bytes) => zip.add(`${job}/${path}`, bytes));
      zip.finish();
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${job}.zip"` },
  });
}
