/**
 * The visitor wordmark with ".je" after it, in Josefin and cyan: the
 * logo's own drawing, and the suffix set as text so it stays sharp and in
 * the site's face. The wrapper's font size is the wordmark's height, so the
 * suffix keeps its proportion at every size.
 */
const SIZE = {
  header: 'h-7 text-[1.75rem] md:h-8 md:text-[2rem]',
  footer: 'h-6 text-[1.5rem]',
} as const;

export function Wordmark({ tone = 'navy', size = 'header' }: { tone?: 'navy' | 'grey'; size?: keyof typeof SIZE }) {
  return (
    <span className={`inline-flex items-end leading-none ${SIZE[size]}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tone === 'grey' ? '/visitor-logo-grey.svg' : '/visitor-logo.svg'} alt="Visitor" width={130} height={33} className="h-full w-auto" />
      <span className="ml-[0.03em] translate-y-[0.2em] font-display text-[1.3em] font-semibold leading-none text-cyan">.je</span>
    </span>
  );
}
