'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth/session';
import { disconnect, drive, folderIdFrom, setFolder } from '@/lib/integrations/google/drive';

/** The Drive folder the package goes into, from its link or id: checked by reaching it as the connected account. */
export async function saveDriveFolder(formData: FormData) {
  await requireStaff();
  const back = String(formData.get('back') ?? '/admin/guide');
  const id = folderIdFrom(String(formData.get('folder') ?? ''));
  if (!id) redirect(`${back}${back.includes('?') ? '&' : '?'}drive=${encodeURIComponent('Paste the folder’s link from Drive, or its id.')}`);
  let note: string;
  try {
    const d = await drive();
    if (!d) throw new Error('Connect Google Drive first.');
    const name = await d.name(id);
    await setFolder(id);
    note = `The package will go into “${name}”.`;
  } catch (e) {
    note = `That folder could not be reached: ${(e as Error).message}`;
  }
  revalidatePath('/admin/guide');
  redirect(`${back}${back.includes('?') ? '&' : '?'}drive=${encodeURIComponent(note)}`);
}

export async function disconnectDrive(formData: FormData) {
  await requireStaff();
  await disconnect();
  revalidatePath('/admin/guide');
  const back = String(formData.get('back') ?? '/admin/guide');
  redirect(`${back}${back.includes('?') ? '&' : '?'}drive=${encodeURIComponent('Google Drive disconnected.')}`);
}
