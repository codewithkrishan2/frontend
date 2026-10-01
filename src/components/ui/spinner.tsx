import { cn } from "@/lib/utils";

type SpinnerProps = {
  className?: string;
  /** Announced to assistive tech. Set to null inside a labelled control. */
  label?: string | null;
};

export function Spinner({ className, label = "Loading" }: SpinnerProps) {
  return (
    <span
      role={label ? "status" : undefined}
      className={cn("inline-block size-4 shrink-0", className)}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-full animate-spin">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeOpacity="0.25"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
