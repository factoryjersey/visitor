import { Sparkles } from 'lucide-react';

/** New to the island's listings in the last six months (lib/domain/new-venue.ts). */
export function NewBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-amber-800 ${className}`}>
      <Sparkles aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.25} />
      New
    </span>
  );
}
