/**
 * Our own advertisement, for the printed guide: a 970×90 super leaderboard
 * on a desktop, a 300×250 MPU on a phone, the standard sizes, so a paying
 * advertiser can take the slot later with nothing else changing.
 */

const COVERS = [
  { src: '/guide/winter-2025.webp', season: 'Winter' },
  { src: '/guide/spring-2026.webp', season: 'Spring' },
  { src: '/guide/summer-2026.webp', season: 'Summer' },
  { src: '/guide/autumn-2026.webp', season: 'Autumn' },
];

const HREF = 'mailto:hello@visitor.je?subject=Advertising%20in%20the%202027%20Visitor%20Guide';

function Covers({ className, tilt }: { className: string; tilt: number }) {
  return (
    <div className="flex shrink-0 items-end" aria-hidden="true">
      {COVERS.map((c, i) => (
        <img
          key={c.src}
          src={c.src}
          alt=""
          width={240}
          height={346}
          loading="lazy"
          style={{ transform: `rotate(${(i - 1.5) * tilt}deg)`, zIndex: i }}
          className={`relative w-auto rounded-[3px] shadow-md ring-1 ring-black/10 ${i ? '-ml-4' : ''} ${className}`}
        />
      ))}
    </div>
  );
}

export function GuideAd() {
  return (
    <aside aria-label="Advertisement" className="mb-14">
      <p className="mb-1.5 text-center text-[0.65rem] uppercase tracking-[0.2em] text-ink/40">Advertisement</p>
      <a
        href={HREF}
        className="group mx-auto block w-fit max-w-full overflow-hidden rounded-md bg-[#f2ca71] text-harbour ring-1 ring-black/5 transition hover:brightness-[1.03]"
      >
        {/* Phone: 300×250 */}
        <div className="flex h-[250px] w-[300px] flex-col items-center justify-between px-5 pb-4 pt-4 text-center md:hidden">
          <Covers className="h-[80px]" tilt={4} />
          <div>
            <p className="font-display text-[1.25rem] font-bold leading-tight">The official Visit Jersey Visitor Guide</p>
            <p className="mt-1 text-[0.8rem] leading-snug">Be in every 2027 edition: winter, spring, summer and autumn.</p>
          </div>
          <span className="rounded-full bg-harbour px-4 py-1.5 font-display text-sm font-semibold text-white">Reserve your space →</span>
        </div>

        {/* Desktop: 970×90 */}
        <div className="hidden h-[90px] w-[970px] max-w-full items-center gap-6 px-6 md:flex">
          <Covers className="h-[74px] translate-y-[10px]" tilt={3} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[1.35rem] font-bold leading-tight">The official Visit Jersey Visitor Guide</p>
            <p className="truncate text-[0.85rem]">Get ready for next summer’s visitors: be in all four 2027 editions.</p>
          </div>
          <span className="shrink-0 rounded-full bg-harbour px-5 py-2 font-display text-sm font-semibold text-white transition group-hover:bg-brand">
            Reserve your space →
          </span>
        </div>
      </a>
    </aside>
  );
}
