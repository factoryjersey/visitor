import { type NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { connect } from '@/lib/integrations/google/drive';

export const dynamic = 'force-dynamic';

/** Back from Google: the code exchanged for the account's refresh token, kept, and back to the guide. */
export async function GET(request: NextRequest) {
  const user = await requireStaff();
  const sp = request.nextUrl.searchParams;
  const back = (note: string) => {
    const res = NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/admin/guide?drive=${encodeURIComponent(note)}`);
    res.cookies.delete({ name: 'guide_drive_state', path: '/admin/guide/drive' });
    return res;
  };
  const state = request.cookies.get('guide_drive_state')?.value;
  if (!state || state !== sp.get('state')) return back('That sign-in did not start here: try Connect Google Drive again.');
  if (sp.get('error')) return back(`Google said: ${sp.get('error')}`);
  const code = sp.get('code');
  if (!code) return back('Google sent no code back.');
  try {
    const who = await connect(code, user.email);
    return back(`Connected as ${who}.`);
  } catch (e) {
    return back((e as Error).message);
  }
}
