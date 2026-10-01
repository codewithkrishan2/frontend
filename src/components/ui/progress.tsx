import { clamp, cn } from "@/lib/utils";

const toneClasses = {
  brand: "bg-brand-500",
  accent: "bg-accent-500",
  pass: "bg-signal-pass",
  warn: "bg-signal-warn",
  fail: "bg-signal-fail",
} as const;

type ProgressProps = {
  /** 0-100. Values outside the range are clamped. */
  value: number;
  tone?: keyof typeof toneClasses;
  /** Accessible name, required because the bar has no visible text. */
  label: string;
  showValue?: boolean;
  className?: string;
};

export function Progress({
  value,
  tone = "brand",
  label,
  showValue = false,
  className,
}: ProgressProps) {
  const percent = clamp(Math.round(value), 0, 100);

  return (
    <div className={cn("w-full", className)}>
      {showValue ? (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono text-ink-200 tabular-nums">
            {percent}%
          </span>
        </div>
      ) : null}

      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={showValue ? undefined : label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            toneClasses[tone],
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export type { ProgressProps };
