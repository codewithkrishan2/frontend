"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Applies reduced-motion handling to every motion component beneath it.
 *
 * `reducedMotion="user"` makes Motion skip transform and layout animations for
 * users who ask for reduced motion, while still allowing opacity and colour to
 * animate — so reveal-on-scroll content becomes visible instead of being
 * stranded at `opacity: 0`.
 *
 * This replaces per-component `useReducedMotion()` branching. That pattern
 * changed the rendered markup based on a value the server cannot know, which
 * produced hydration mismatches; this does not touch markup at all.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
