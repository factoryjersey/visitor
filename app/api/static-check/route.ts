import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export const dynamic = 'force-dynamic';

/** Temporary: which page chunks the running build has, to find why [slug] chunks 404. */
export function GET() {
  const base = join(process.cwd(), '.next/static/chunks/app/(site)');
  const list = (p: string) => {
    try {
      return readdirSync(join(base, p));
    } catch (e) {
      return [`error: ${(e as Error).message}`];
    }
  };
  return Response.json({ cwd: process.cwd(), site: list(''), venues: list('venues'), venueSlug: list('venues/[slug]') });
}
