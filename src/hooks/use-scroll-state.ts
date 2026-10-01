"use client";

import { useEffect, useState } from "react";

/**
 * Tracks whether the page has scrolled past `threshold` pixels.
 *
 * The listener is passive and only calls `setState` when the boolean actually
 * flips, so scrolling does not re-render on every frame.
 */
export function useScrolledPast(threshold = 12): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function read() {
      setScrolled((current) => {
        const next = window.scrollY > threshold;
        return current === next ? current : next;
      });
    }

    read();
    window.addEventListener("scroll", read, { passive: true });

    return () => window.removeEventListener("scroll", read);
  }, [threshold]);

  return scrolled;
}
