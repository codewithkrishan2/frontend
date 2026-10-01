"use client";

import { useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type MagneticProps = {
  children: ReactNode;
  /** Maximum pixels the element drifts towards the cursor. */
  strength?: number;
  className?: string;
};

/**
 * Nudges its child towards the pointer, then springs back on leave.
 *
 * Transforms are written straight to style rather than through React state:
 * a pointermove handler firing at frame rate must not trigger re-renders.
 * Skipped entirely on touch devices and under reduced-motion.
 */
export function Magnetic({ children, strength = 8, className }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const shouldReduceMotion = useReducedMotion();

  function onPointerMove(event: React.PointerEvent<HTMLSpanElement>) {
    if (shouldReduceMotion || event.pointerType !== "mouse") return;

    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const offsetX = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
    const offsetY =
      (event.clientY - (rect.top + rect.height / 2)) / rect.height;

    node.style.transform = `translate3d(${offsetX * strength * 2}px, ${
      offsetY * strength * 2
    }px, 0)`;
  }

  function reset() {
    const node = ref.current;
    if (node) node.style.transform = "translate3d(0, 0, 0)";
  }

  return (
    <span
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      className={cn(
        "inline-flex transition-transform duration-500 ease-out",
        className,
      )}
    >
      {children}
    </span>
  );
}

export type { MagneticProps };
