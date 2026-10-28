import { Map } from 'lucide-react';

/** On the official Visitor Map: a business that booked a place on the map. */
export function OnVisitorMap({ edition, className = '' }: { edition: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-sea/10 px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-sea ${className}`} title={`On the ${edition} Jersey Official Visitor Map`}>
      <Map aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.25} />
      On the Visitor Map
    </span>
  );
}
