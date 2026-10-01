import { cn } from "@/lib/utils";

const toneStyles = {
  brand: "oklch(0.55 0.225 278 / 0.38)",
  accent: "oklch(0.63 0.12 200 / 0.34)",
  pass: "oklch(0.74 0.17 156 / 0.26)",
} as const;

type SectionGlowProps = {
  tone?: keyof typeof toneStyles;
  /** Horizontal placement of the glow's centre. */
  position?: "left" | "center" | "right";
  /** Classes applied to the glow itself, e.g. `top-32`. */
  className?: string;
};

/**
 * A single soft radial glow, for lifting one section off the page background.
 *
 * The glow is deliberately wider than most containers and is offset past their
 * edges, which is what makes it read as atmosphere rather than a shape. That
 * also means it must be clipped: an unclipped 608px element hanging off the
 * right edge widens the document and produces a horizontal scrollbar on every
 * viewport. The `inset-0 overflow-hidden` wrapper contains it to the bounds of
 * the parent section.
 *
 * The parent must be `relative`.
 */
export function SectionGlow({
  tone = "brand",
  position = "center",
  className,
}: SectionGlowProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div
        className={cn(
          "absolute h-[24rem] w-[38rem] rounded-full opacity-60 blur-[110px]",
          position === "left" && "-left-32",
          position === "center" && "left-1/2 -translate-x-1/2",
          position === "right" && "-right-32",
          className,
        )}
        style={{
          background: `radial-gradient(circle, ${toneStyles[tone]}, transparent 68%)`,
        }}
      />
    </div>
  );
}

export type { SectionGlowProps };
