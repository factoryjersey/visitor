import Link from 'next/link';
import { setProviderCode } from '@/app/actions';
import { listProviders } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

/**
 * The key the tours pages print: each provider once, with the code the
 * entries use. Codes carry over between editions; the guide prints only
 * providers with something included.
 */
export default async function Providers() {
  const rows = await listProviders();
  const missing = rows.filter((r) => !r.provider.code && r.included > 0).length;
  return (
    <>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="font-display text-2xl">Tour providers</h1>
        <p className="text-sm text-stone-500">
          {rows.length} providers{missing > 0 && <span className="text-amber-700"> · {missing} in the guide without a code</span>}
        </p>
      </div>
      <table className="w-full rounded border border-stone-200 bg-white text-sm">
        <thead className="text-left text-xs text-stone-500">
          <tr><th className="p-2">Code</th><th className="p-2">Provider</th><th className="p-2">Contact</th><th className="p-2 text-right">Tours</th><th className="p-2 text-right">In guide</th></tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {rows.map(({ provider: p, total, included }) => (
            <tr key={p.id}>
              <td className="p-2">
                <form action={setProviderCode} className="flex gap-1">
                  <input type="hidden" name="id" value={p.id} />
                  <input name="code" defaultValue={p.code ?? ''} maxLength={8} className="w-16 rounded border border-stone-300 px-1.5 py-0.5 font-mono uppercase" aria-label={`Code for ${p.name}`} />
                  <button type="submit" className="rounded border border-stone-300 px-2 text-xs hover:bg-stone-100">Set</button>
                </form>
              </td>
              <td className="p-2">{p.name}</td>
              <td className="p-2 text-stone-500">{[p.phone, p.website?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '')].filter(Boolean).join(' · ')}</td>
              <td className="p-2 text-right"><Link href={`/admin/tours?q=${encodeURIComponent(p.name)}&regular=1&ongoing=1`} className="hover:underline">{total}</Link></td>
              <td className="p-2 text-right">{included || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
