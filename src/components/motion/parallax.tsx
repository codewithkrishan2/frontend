"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type ParallaxProps = {
  children: ReactNode;
  /** Pixels of travel across the element's full scroll pass. */
  distance?: number;
  /**
   * Which way the layer drifts relative to the page, which is what places it in
   * depth:
   *
   * - `lead` — travels further than the scroll, reading as foreground.
   * - `lag` — travels less, reading as background.
   *
   * Two siblings given opposing values separate as they cross the viewport, so a
   * comparison can be expressed by the scroll itself rather than only described.
   */
  layer?: "lead" | "lag";
  className?: string;
};

/**
 * Moves children vertically as the container scrolls past.
 *
 * Driven by a scroll-linked motion value with a spring, so it stays smooth
 * without a scroll listener that re-renders React every frame.
 *
 * Scroll-linked transforms are not "animations", so `MotionConfig` does not
 * disable them; the reduced-motion preference is applied here by collapsing the
 * travel distance to zero. The markup is identical either way.
 */
export function Parallax({
  children,
  distance = 60,
  layer = "lead",
  className,
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // `lead` starts pushed down and ends pushed up, so it outruns the page; `lag`
  // is the same path reversed.
  const signed = layer === "lag" ? -distance : distance;
  const raw = useTransform(scrollYProgress, [0, 1], [signed, -signed]);
  const y = useSpring(raw, { stiffness: 120, damping: 30, mass: 0.4 });

  return (
    <div ref={ref} className={className}>
      {/* A literal `0` rather than a zeroed spring when motion is reduced. The
          preference is only known after hydration, so a spring would still be
          easing down from its first value for a moment after load — visible
          drift for the one user who asked not to see any. */}
      <motion.div style={{ y: prefersReducedMotion ? 0 : y }}>
        {children}
      </motion.div>
    </div>
  );
}

export type { ParallaxProps };
