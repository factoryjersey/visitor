'use client';

/**
 * The tick that brings ongoing listings in. Submits its form as soon as
 * it changes; without JavaScript the form's button does the same.
 */
export function ShowToggle({ name, label, hint, checked }: { name: string; label: string; hint: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        value="1"
        defaultChecked={checked}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="mt-0.5 h-4 w-4 accent-sea"
      />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-harbour/60">{hint}</span>
      </span>
    </label>
  );
}
