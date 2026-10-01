import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Placeholder block for loading states. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-ink-800/70", className)}
      {...props}
    />
  );
}

type SkeletonTextProps = ComponentProps<"div"> & {
  lines?: number;
};

/** A few staggered lines, for paragraph placeholders. */
export function SkeletonText({
  lines = 3,
  className,
  ...props
}: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3.5", index === lines - 1 ? "w-2/5" : "w-full")}
        />
      ))}
    </div>
  );
}
