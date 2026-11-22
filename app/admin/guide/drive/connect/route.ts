import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/session';
import { consentUrl, driveConfigured } from '@/lib/integrations/google/drive';

export const dynamic = 'force-dynamic';

/** Off to Google to connect the account the package goes to Drive as; the state cookie proves the way back is ours. */
export async function GET() {
  await requireStaff();
  if (!driveConfigured()) return new NextResponse('Google Drive is not set up: GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are needed in Railway.', { status: 503 });
  const state = randomBytes(24).toString('base64url');
  const res = NextResponse.redirect(consentUrl(state));
  res.cookies.set('guide_drive_state', state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/admin/guide/drive', maxAge: 600 });
  return res;
}
