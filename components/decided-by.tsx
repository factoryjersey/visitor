/** "Included by ben@factory.je, 18 Oct 2026". Nothing when nobody has decided. */
export function DecidedBy(props: { inclusion: string; by: string | null; at: Date | null; editedBy: string | null; editedAt: Date | null }) {
  const day = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const verb = props.inclusion === 'included' ? 'Included' : props.inclusion === 'excluded' ? 'Left out' : 'Reset';
  return (
    <div className="mt-2 space-y-0.5 text-xs text-stone-500">
      {props.by && props.at && <p>{verb} by {props.by}, {day(props.at)}</p>}
      {props.editedBy && props.editedAt && <p>Edited by {props.editedBy}, {day(props.editedAt)}</p>}
    </div>
  );
}
