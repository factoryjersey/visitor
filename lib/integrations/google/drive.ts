/**
 * Google Drive, for putting the guide's InDesign package straight into the
 * edition's working folder. guide.je acts as the Google account staff
 * connect once (OAuth, offline access): files a service account made in a
 * personal My Drive would count against no one's storage and Google
 * refuses them, so it has to be a person's account.
 *
 * Plain fetch: the token exchange, a folder found or made by name, and a
 * file uploaded (resumable, so pictures of any size go) or, when one of the
 * same name is there already, its contents replaced, so a second export
 * updates the first rather than adding copies.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { googleDrive } from '@/lib/db/schema';
import { env } from '@/lib/env';

const SCOPE = 'https://www.googleapis.com/auth/drive openid email';
const FOLDER = 'application/vnd.google-apps.folder';

export const driveConfigured = () => !!env.GOOGLE_OAUTH_CLIENT_ID && !!env.GOOGLE_OAUTH_CLIENT_SECRET;
export const redirectUri = () => `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/admin/guide/drive/callback`;

/** Google's consent page, coming back to the callback with a code (and the state, to check it is ours). */
export function consentUrl(state: string): string {
  const q = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID ?? '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    // Always ask, so Google always sends a refresh token, even to an account that agreed before.
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function token(body: Record<string, string>): Promise<{ access_token: string; refresh_token?: string; id_token?: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_OAUTH_CLIENT_ID ?? '', client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET ?? '', ...body }),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; id_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(`Google refused the sign-in: ${json.error_description ?? json.error ?? res.status}`);
  return json as { access_token: string; refresh_token?: string; id_token?: string };
}

/** The callback's code exchanged and kept: the account's refresh token, and its address to show staff. */
export async function connect(code: string, by: string): Promise<string> {
  const t = await token({ code, grant_type: 'authorization_code', redirect_uri: redirectUri() });
  if (!t.refresh_token) throw new Error('Google sent no refresh token: remove guide.je from the account’s third-party access and connect again.');
  // The id token's middle part names the account; it came straight from Google over TLS, so it is read, not verified.
  const claims = t.id_token ? (JSON.parse(Buffer.from(t.id_token.split('.')[1] ?? '', 'base64url').toString('utf8')) as { email?: string }) : {};
  const email = claims.email ?? null;
  const values = { id: 1, email, refreshToken: t.refresh_token, connectedBy: by, connectedAt: new Date() };
  await db.insert(googleDrive).values(values).onConflictDoUpdate({ target: googleDrive.id, set: values });
  return email ?? 'the account';
}

/** The connected account and its folder, without the token. */
export async function driveLink(): Promise<{ email: string | null; folderId: string | null } | null> {
  const [row] = await db.select({ email: googleDrive.email, folderId: googleDrive.folderId }).from(googleDrive).where(eq(googleDrive.id, 1));
  return row ?? null;
}

export async function setFolder(folderId: string | null): Promise<void> {
  await db.update(googleDrive).set({ folderId }).where(eq(googleDrive.id, 1));
}

export async function disconnect(): Promise<void> {
  await db.delete(googleDrive).where(eq(googleDrive.id, 1));
}

/** A folder id from what staff paste: the id itself, or the folder's address in Drive. */
export function folderIdFrom(given: string): string | null {
  const s = given.trim();
  const m = /\/folders\/([\w-]{10,})/.exec(s) ?? /[?&]id=([\w-]{10,})/.exec(s);
  if (m) return m[1]!;
  return /^[\w-]{20,}$/.test(s) ? s : null;
}

export type Drive = {
  /** The folder of that name in the parent, made if it is not there. */
  folder(name: string, parent: string): Promise<string>;
  /** The file put in the folder, replacing the contents of one of the same name. */
  put(name: string, parent: string, bytes: Uint8Array, mime: string): Promise<void>;
  /** The folder's name, to check it can be reached. */
  name(id: string): Promise<string>;
};

/** A Drive client as the connected account, or null when none is connected. */
export async function drive(): Promise<Drive | null> {
  const [row] = await db.select().from(googleDrive).where(eq(googleDrive.id, 1));
  if (!row) return null;
  let access = '';
  let expires = 0;
  const auth = async () => {
    if (!access || Date.now() > expires) {
      const t = await token({ refresh_token: row.refreshToken, grant_type: 'refresh_token' });
      access = t.access_token;
      expires = Date.now() + 45 * 60_000;
    }
    return { authorization: `Bearer ${access}` };
  };
  const call = async (url: string, init: RequestInit = {}) => {
    for (let attempt = 0; ; attempt += 1) {
      const res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), ...(await auth()) } });
      // Rate limits and Google's own hiccups: wait and try again, a few times.
      if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        continue;
      }
      if (!res.ok) throw new Error(`Drive ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return res;
    }
  };
  const q = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const find = async (name: string, parent: string, folder: boolean) => {
    const query = `name = '${q(name)}' and '${q(parent)}' in parents and trashed = false and mimeType ${folder ? '=' : '!='} '${FOLDER}'`;
    const res = await call(`https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q: query, fields: 'files(id)', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true', pageSize: '1' })}`);
    return ((await res.json()) as { files: { id: string }[] }).files[0]?.id ?? null;
  };
  const folders = new Map<string, Promise<string>>();
  return {
    folder(name, parent) {
      const key = `${parent}/${name}`;
      const had = folders.get(key);
      if (had) return had;
      const made = (async () => {
        const found = await find(name, parent, true);
        if (found) return found;
        const res = await call('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, mimeType: FOLDER, parents: [parent] }),
        });
        return ((await res.json()) as { id: string }).id;
      })();
      folders.set(key, made);
      return made;
    },
    async put(name, parent, bytes, mime) {
      const existing = await find(name, parent, false);
      const start = await call(
        existing
          ? `https://www.googleapis.com/upload/drive/v3/files/${existing}?uploadType=resumable&supportsAllDrives=true`
          : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
        {
          method: existing ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-type': mime, 'x-upload-content-length': String(bytes.length) },
          body: JSON.stringify(existing ? {} : { name, parents: [parent] }),
        },
      );
      const session = start.headers.get('location');
      if (!session) throw new Error('Drive gave no upload address');
      await call(session, { method: 'PUT', headers: { 'content-type': mime }, body: bytes });
    },
    async name(id) {
      const res = await call(`https://www.googleapis.com/drive/v3/files/${id}?fields=name,mimeType&supportsAllDrives=true`);
      const f = (await res.json()) as { name: string; mimeType: string };
      if (f.mimeType !== FOLDER) throw new Error('That is a file, not a folder');
      return f.name;
    },
  };
}
