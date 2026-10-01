import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<ComponentProps<"input">, "type">;

/**
 * Checkbox built on the native input with `appearance-none`, so it keeps
 * native focus, form and keyboard semantics while still being styleable.
 */
export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn(
        "relative size-4 shrink-0 cursor-pointer appearance-none rounded border border-border-strong bg-ink-950/60",
        "transition-[background-color,border-color] duration-150",
        "hover:border-ink-500",
        "checked:border-brand-500 checked:bg-brand-600",
        // Tick drawn with a mask so it inherits the text colour.
        "checked:after:absolute checked:after:inset-0 checked:after:bg-white",
        "checked:after:[mask:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8.5l3 3 6-6' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")_center/100%_no-repeat]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

type SwitchProps = Omit<ComponentProps<"input">, "type">;

/** Toggle switch, also a native checkbox underneath. */
export function Switch({ className, ...props }: SwitchProps) {
  return (
    <input
      type="checkbox"
      role="switch"
      className={cn(
        "relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full border border-border-strong bg-ink-800",
        "transition-colors duration-200",
        "checked:border-brand-500 checked:bg-brand-600",
        // Knob.
        "after:absolute after:top-0.5 after:left-0.5 after:size-3.5 after:rounded-full after:bg-white",
        "after:transition-transform after:duration-200 after:ease-out",
        "checked:after:translate-x-4",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export type { CheckboxProps, SwitchProps };
