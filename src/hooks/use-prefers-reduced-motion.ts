"use client";

import { useSyncExternalStore } from "react";

/**
 * Reads `prefers-reduced-motion` in a hydration-safe way.
 *
 * `useSyncExternalStore` is the right primitive for a media query: it takes a
 * separate server snapshot, so the server and the hydrating client agree on
 * `false` and React re-reads the real value straight after hydration.
 *
 * Motion's own `useReducedMotion()` reads the media query synchronously on the
 * client, so a reduced-motion user gets `false` on the server and `true` on the
 * first client render — a hydration mismatch the moment that value reaches
 * markup.
 *
 * Only needed where the preference must change rendered output or a scroll
 * transform. For ordinary Motion animations, prefer `MotionProvider`.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onStoreChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
