"use client";

import { useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type TiltProps = {
  children: ReactNode;
  /** Maximum rotation in degrees on each axis. */
  max?: number;
  /** Perspective depth. Lower values exaggerate the effect. */
  perspective?: number;
  /** Adds a light sheen that follows the pointer. */
  glare?: boolean;
  className?: string;
};

/**
 * Perspective tilt that follows the pointer.
 *
 * Like `Magnetic`, this writes transforms directly to the DOM to stay off the
 * React render path, and no-ops for touch input and reduced-motion users.
 */
export function Tilt({
  children,
  max = 6,
  perspective = 900,
  glare = false,
  className,
}: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (shouldReduceMotion || event.pointerType !== "mouse") return;

    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    const rotateY = (px - 0.5) * max * 2;
    const rotateX = (0.5 - py) * max * 2;

    node.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    if (glareRef.current) {
      glareRef.current.style.background = `radial-gradient(420px circle at ${px * 100}% ${
        py * 100
      }%, oklch(1 0 0 / 0.1), transparent 45%)`;
    }
  }

  function reset() {
    const node = ref.current;
    if (node) {
      node.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg)`;
    }
    if (glareRef.current) glareRef.current.style.background = "transparent";
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      className={cn(
        "relative transition-transform duration-500 ease-out [transform-style:preserve-3d]",
        className,
      )}
    >
      {children}

      {glare ? (
        <div
          ref={glareRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
        />
      ) : null}
    </div>
  );
}

export type { TiltProps };
