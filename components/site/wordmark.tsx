/**
 * The visitor.je logo, its "Jersey’s What’s On Guide" line included:
 * charcoal in the header, a lighter grey in the footer.
 */
const SIZE = { header: 'h-12 md:h-14', footer: 'h-11' } as const;

export function Wordmark({ tone = 'dark', size = 'header' }: { tone?: 'dark' | 'grey'; size?: keyof typeof SIZE }) {
  return (
    <img
      src={tone === 'grey' ? '/visitor-logo-grey.svg' : '/visitor-logo.svg'}
      alt="Visitor.je, Jersey’s What’s On Guide"
      width={274}
      height={73}
      className={`block w-auto ${SIZE[size]}`}
    />
  );
}
