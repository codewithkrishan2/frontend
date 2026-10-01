"use client";

import type { Transition } from "motion/react";

import {
  motionTags,
  type MotionTag,
  type MotionTagProps,
} from "@/components/motion/motion-tags";

const offsets = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
  none: { x: 0, y: 0 },
} as const;

type RevealProps = MotionTagProps & {
  /** Direction the element travels from. */
  from?: keyof typeof offsets;
  /** Seconds of delay, for manual staggering. */
  delay?: number;
  duration?: number;
  /** Starting scale, for a subtle zoom-in. */
  scale?: number;
  /** Render as a different element, e.g. "li" or "section". */
  as?: MotionTag;
  /** Replay every time it enters the viewport instead of only once. */
  repeat?: boolean;
};

/**
 * Fades and translates children in when they scroll into view.
 *
 * Reduced motion is handled globally by `MotionProvider`
 * (`reducedMotion="user"`): the translate is dropped and only the fade runs, so
 * content always ends up visible. Nothing here branches on the user's
 * preference, which keeps server and client markup identical.
 */
export function Reveal({
  from = "up",
  delay = 0,
  duration = 0.6,
  scale,
  as = "div",
  repeat = false,
  ...props
}: RevealProps) {
  const Component = motionTags[as];
  const offset = offsets[from];

  const transition: Transition = {
    duration,
    delay,
    ease: [0.16, 1, 0.3, 1],
  };

  return (
    <Component
      initial={{ opacity: 0, x: offset.x, y: offset.y, scale: scale ?? 1 }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: !repeat, amount: 0.15, margin: "0px 0px -80px 0px" }}
      transition={transition}
      {...props}
    />
  );
}

export type { RevealProps };
