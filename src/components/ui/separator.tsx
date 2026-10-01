import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type SeparatorProps = Omit<ComponentProps<"div">, "children"> & {
  orientation?: "horizontal" | "vertical";
  /** Fades out towards both ends. Reads better on dark surfaces. */
  soft?: boolean;
};

export function Separator({
  className,
  orientation = "horizontal",
  soft = false,
  ...props
}: SeparatorProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        isHorizontal ? "h-px w-full" : "h-full w-px",
        soft
          ? isHorizontal
            ? "bg-gradient-to-r from-transparent via-white/12 to-transparent"
            : "bg-gradient-to-b from-transparent via-white/12 to-transparent"
          : "bg-border",
        className,
      )}
      {...props}
    />
  );
}

export type { SeparatorProps };
