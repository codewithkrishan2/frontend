import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatProps = {
  label: string;
  value: ReactNode;
  /** Short qualifier under the value, e.g. "vs. last week". */
  hint?: string;
  /** Signed change, rendered with direction colouring. */
  delta?: {
    value: string;
    direction: "up" | "down" | "flat";
    /** Whether "up" is good. Defaults to true. */
    positiveIsGood?: boolean;
  };
  icon?: ReactNode;
  className?: string;
};

export function Stat({
  label,
  value,
  hint,
  delta,
  icon,
  className,
}: StatProps) {
  const positiveIsGood = delta?.positiveIsGood ?? true;
  const isGood =
    delta?.direction === "flat"
      ? null
      : delta
        ? (delta.direction === "up") === positiveIsGood
        : null;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="text-subtle-foreground" aria-hidden>
            {icon}
          </span>
        ) : null}
        <p className="text-xs font-medium tracking-wide text-subtle-foreground uppercase">
          {label}
        </p>
      </div>

      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight text-ink-50 tabular-nums">
          {value}
        </p>

        {delta ? (
          <span
            className={cn(
              "font-mono text-xs",
              isGood === null && "text-muted-foreground",
              isGood === true && "text-signal-pass",
              isGood === false && "text-signal-fail",
            )}
          >
            {delta.direction === "up"
              ? "↑"
              : delta.direction === "down"
                ? "↓"
                : "→"}{" "}
            {delta.value}
          </span>
        ) : null}
      </div>

      {hint ? <p className="text-xs text-subtle-foreground">{hint}</p> : null}
    </div>
  );
}

export type { StatProps };
