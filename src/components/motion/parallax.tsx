"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type ParallaxProps = {
  children: ReactNode;
  /** Pixels of travel across the element's full scroll pass. */
  distance?: number;
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
  className,
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const travel = prefersReducedMotion ? 0 : distance;
  const raw = useTransform(scrollYProgress, [0, 1], [travel, -travel]);
  const y = useSpring(raw, { stiffness: 120, damping: 30, mass: 0.4 });

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

export type { ParallaxProps };
