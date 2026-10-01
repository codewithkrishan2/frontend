import { cn } from "@/lib/utils";

/**
 * Fixed, page-wide atmosphere: two drifting colour blobs, a masked blueprint
 * grid and a grain overlay.
 *
 * Entirely CSS. It ships no JavaScript, never re-renders, and the animated
 * layers only transform (never repaint), so it stays on the compositor.
 */
export function PageBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      {/* Brand glow, top-left. */}
      <div
        className="absolute -top-[22rem] -left-[18rem] size-[46rem] animate-drift rounded-full opacity-55 blur-[120px] will-change-transform"
        style={{
          background:
            "radial-gradient(circle, oklch(0.55 0.225 278 / 0.55), transparent 65%)",
        }}
      />

      {/* Accent glow, right, offset in time so the two never sync up. */}
      <div
        className="absolute top-[14rem] -right-[20rem] size-[40rem] animate-drift rounded-full opacity-40 blur-[120px] will-change-transform"
        style={{
          background:
            "radial-gradient(circle, oklch(0.63 0.12 200 / 0.5), transparent 65%)",
          animationDelay: "-11s",
          animationDuration: "31s",
        }}
      />

      {/* Deep violet wash near the fold, anchoring the hero. */}
      <div
        className="absolute top-[38rem] left-1/2 size-[52rem] -translate-x-1/2 rounded-full opacity-25 blur-[140px]"
        style={{
          background:
            "radial-gradient(circle, oklch(0.48 0.21 277 / 0.45), transparent 70%)",
        }}
      />

      {/* Very faint blueprint grid. Deliberately subordinate to the hero's
          code-character field (CodeField), which now carries the texture. */}
      <div
        className="absolute inset-0 grid-lines opacity-25"
        style={{
          maskImage:
            "radial-gradient(ellipse 100% 60% at 50% 0%, #000 20%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 100% 60% at 50% 0%, #000 20%, transparent 75%)",
        }}
      />

      {/* Grain. Low opacity keeps it as texture rather than visible noise. */}
      <div className="absolute inset-0 noise opacity-[0.035] mix-blend-overlay" />

      {/* Vignette, so content in the centre keeps the strongest contrast. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% 40%, transparent 40%, oklch(0.09 0.01 265 / 0.75) 100%)",
        }}
      />
    </div>
  );
}
