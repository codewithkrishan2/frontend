import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
};

/**
 * CodeRev mark: a chevron pair (the `</>` of code) closing into a checkmark
 * stroke, for "reviewed". Drawn on a 32-unit grid so it stays crisp when
 * rendered small.
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("size-8 shrink-0", className)}
    >
      <defs>
        <linearGradient id="coderev-mark" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="oklch(0.81 0.1 285)" />
          <stop offset="55%" stopColor="oklch(0.62 0.205 280)" />
          <stop offset="100%" stopColor="oklch(0.8 0.12 197)" />
        </linearGradient>
      </defs>

      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="8.25"
        fill="oklch(0.19 0.013 265)"
        stroke="oklch(1 0 0 / 0.12)"
        strokeWidth="1.5"
      />

      {/* Left chevron */}
      <path
        d="M12.5 10.5 7.5 16l5 5.5"
        fill="none"
        stroke="url(#coderev-mark)"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Review tick, doubling as the right chevron */}
      <path
        d="M16.25 19.75 19 22.5l5.5-11"
        fill="none"
        stroke="url(#coderev-mark)"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
  /** Hides the wordmark, leaving only the mark. */
  markOnly?: boolean;
};

export function Logo({
  className,
  markClassName,
  markOnly = false,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />

      {markOnly ? (
        <span className="sr-only">CodeRev</span>
      ) : (
        <span className="text-[1.0625rem] font-semibold tracking-tight text-ink-50">
          Code
          <span className="text-brand-300">Rev</span>
        </span>
      )}
    </span>
  );
}

export type { LogoProps, LogoMarkProps };
