"use client";

import { useRef, type ReactNode } from "react";

type SpotlightSectionProps = {
  children: ReactNode;
  className?: string;
  /** Accessible landmark labelling, forwarded to the section element. */
  "aria-labelledby"?: string;
  id?: string;
};

/**
 * Tracks the pointer and publishes its position as CSS custom properties
 * (`--spot-x`, `--spot-y`, `--spot-opacity`) on the section element.
 *
 * Any descendant can then position a mask or gradient at the cursor —
 * `CodeField` uses it to light up the characters under the pointer.
 *
 * Performance notes, because pointermove fires at frame rate:
 *
 * - Nothing goes through React state. Coordinates are written straight to the
 *   element's inline style, so a moving cursor never triggers a re-render.
 * - Writes are coalesced into one `requestAnimationFrame` callback, so several
 *   events in the same frame produce a single style mutation.
 * - Only `mouse` pointers are tracked. A touch "hover" does not exist, and
 *   tracking taps would make the effect flash.
 * - Skipped entirely under `prefers-reduced-motion`, which leaves the fallback
 *   position in the CSS (a static, centred glow).
 *
 * The reduced-motion preference is read from `matchMedia` inside the event
 * handler rather than from a hook. A hook's value is necessarily `false` on the
 * server and for the first client render — it cannot be otherwise, since the
 * server cannot know the preference — which leaves a window during hydration
 * where a reduced-motion user moving the mouse would get a frame of spotlight.
 * Reading the query at event time has no such window.
 */
export function SpotlightSection({
  children,
  className,
  ...props
}: SpotlightSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef(0);
  const position = useRef({ x: 0, y: 0 });
  const reducedMotionQuery = useRef<MediaQueryList | null>(null);

  /** Lazily created: `matchMedia` does not exist during server rendering. */
  function prefersReducedMotion(): boolean {
    reducedMotionQuery.current ??= window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    return reducedMotionQuery.current.matches;
  }

  function flush() {
    frame.current = 0;
    const node = ref.current;
    if (!node) return;

    node.style.setProperty("--spot-x", `${position.current.x}px`);
    node.style.setProperty("--spot-y", `${position.current.y}px`);
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || prefersReducedMotion()) return;

    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    position.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    if (frame.current) return;
    frame.current = requestAnimationFrame(flush);
  }

  function setActive(active: boolean) {
    if (prefersReducedMotion()) return;
    ref.current?.style.setProperty("--spot-opacity", active ? "1" : "0");
  }

  return (
    <section
      ref={ref}
      className={className}
      onPointerMove={onPointerMove}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => {
        setActive(false);
        if (frame.current) {
          cancelAnimationFrame(frame.current);
          frame.current = 0;
        }
      }}
      {...props}
    >
      {children}
    </section>
  );
}

export type { SpotlightSectionProps };
