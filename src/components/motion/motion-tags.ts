import { motion, type HTMLMotionProps } from "motion/react";
import type { ComponentType } from "react";

/**
 * Pre-created motion components, keyed by tag name.
 *
 * Why this exists: calling `motion.create()` during render produces a new
 * component type on every pass, which remounts the subtree and discards its
 * state. Looking the component up in a static map avoids that completely.
 *
 * Add a tag here when a section needs one.
 */
const tags = {
  div: motion.div,
  span: motion.span,
  section: motion.section,
  article: motion.article,
  ul: motion.ul,
  ol: motion.ol,
  li: motion.li,
  dl: motion.dl,
  p: motion.p,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
};

export type MotionTag = keyof typeof tags;

/** Props accepted by every entry in `motionTags`. */
export type MotionTagProps = Omit<HTMLMotionProps<"div">, "ref">;

/**
 * The map is exposed under a single prop type.
 *
 * Each `motion.*` component is typed against its own element, so the union of
 * them has conflicting per-element event handler signatures (a
 * `ClipboardEventHandler<HTMLUListElement>` is not a
 * `ClipboardEventHandler<HTMLDivElement>`). That makes the union unusable in a
 * generic wrapper. Unifying the view here is safe: the props these wrappers
 * actually forward — className, style, children, variants, transition — are
 * identical across every element, and the correct DOM element is still
 * rendered at runtime.
 */
export const motionTags = tags as Record<
  MotionTag,
  ComponentType<MotionTagProps>
>;
