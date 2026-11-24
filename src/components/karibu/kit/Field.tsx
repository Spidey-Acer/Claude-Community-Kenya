/**
 * Field: a form label with optional hint and error, wired for assistive tech.
 * `children` is a render function that receives the id and aria attributes to
 * spread onto the input, so the label's `htmlFor` and the input's
 * `aria-describedby` always point at real elements.
 */

import { useId, type ReactNode } from "react";

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: (controlProps: FieldControlProps) => ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const controlProps: FieldControlProps = { id, "aria-describedby": describedBy };
  if (error) controlProps["aria-invalid"] = true;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-inter text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </label>
      {children(controlProps)}
      {hint && (
        <p id={hintId} className="mt-1 font-inter text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 font-inter text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
