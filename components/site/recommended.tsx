import { BadgeCheck } from 'lucide-react';

/** Visitor guide featured: a business featured in the printed guide. */
export function Recommended({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-brand ${className}`}>
      <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.25} />
      Visitor guide featured
    </span>
  );
}
