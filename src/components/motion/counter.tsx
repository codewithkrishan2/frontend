"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { formatNumber } from "@/lib/utils";

type CounterProps = {
  /** Final value. */
  value: number;
  /** Decimal places to render. */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
};

/**
 * Counts up to `value` the first time it scrolls into view.
 *
 * The element starts at the final value in markup so that server-rendered
 * output and reduced-motion users both show real numbers.
 */
export function Counter({
  value,
  decimals = 0,
  prefix,
  suffix,
  duration = 1.6,
  className,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const shouldReduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!inView || shouldReduceMotion || hasRun.current) return;
    hasRun.current = true;

    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    });

    return () => controls.stop();
  }, [inView, shouldReduceMotion, value, duration]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : formatNumber(Math.round(display));

  return (
    <span ref={ref} className={className}>
      {prefix}
      <span className="tabular-nums">{formatted}</span>
      {suffix}
    </span>
  );
}

export type { CounterProps };
