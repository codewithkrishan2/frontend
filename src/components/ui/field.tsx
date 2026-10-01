"use client";

import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  /** Receives the wiring needed to associate label, hint and error. */
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
  }) => ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
};

/**
 * Labelled form row that wires up `aria-describedby` and `aria-invalid` for
 * whatever control it wraps.
 *
 * ```tsx
 * <Field label="Repository" error={errors.repo}>
 *   {(props) => <Input {...props} placeholder="owner/name" />}
 * </Field>
 * ```
 */
export function Field({
  label,
  children,
  hint,
  error,
  required = false,
  className,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy =
    [error ? errorId : undefined, hint ? hintId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink-200">
        {label}
        {required ? (
          <span className="ml-1 text-signal-fail" aria-hidden>
            *
          </span>
        ) : null}
      </label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-subtle-foreground">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-xs text-signal-fail">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type { FieldProps };
