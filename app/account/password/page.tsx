import { requireUser } from '@/lib/auth/session';
import { PasswordForm } from './form';

export const dynamic = 'force-dynamic';

export default async function PasswordPage() {
  const user = await requireUser();
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl">Password</h1>
      <p className="text-sm text-stone-600">For signing in as {user.email}.</p>
      <PasswordForm />
    </div>
  );
}
