"use client";

import {
  motionTags,
  type MotionTag,
  type MotionTagProps,
} from "@/components/motion/motion-tags";

type StaggerProps = MotionTagProps & {
  /** Seconds between each child's animation. */
  gap?: number;
  /** Seconds before the first child animates. */
  delay?: number;
  as?: MotionTag;
};

/**
 * Parent half of a staggered reveal. Wrap `StaggerItem` children.
 *
 * A variant chain rather than per-child delays, so the sequence stays correct
 * no matter how many children are rendered. Reduced motion is handled globally
 * by `MotionProvider`.
 */
export function Stagger({
  gap = 0.08,
  delay = 0,
  as = "div",
  ...props
}: StaggerProps) {
  const Component = motionTags[as];

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -80px 0px" }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: gap, delayChildren: delay },
        },
      }}
      {...props}
    />
  );
}

type StaggerItemProps = MotionTagProps & {
  as?: MotionTag;
  /** Vertical travel distance in pixels. */
  distance?: number;
};

export function StaggerItem({
  as = "div",
  distance = 20,
  ...props
}: StaggerItemProps) {
  const Component = motionTags[as];

  return (
    <Component
      variants={{
        hidden: { opacity: 0, y: distance },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      {...props}
    />
  );
}

export type { StaggerProps, StaggerItemProps };
