import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const containerVariants = cva("mx-auto w-full", {
  variants: {
    width: {
      narrow: "max-w-3xl",
      default: "max-w-6xl",
      wide: "max-w-7xl",
    },
    gutter: {
      true: "px-5 sm:px-6 lg:px-8",
      false: "",
    },
  },
  defaultVariants: {
    width: "default",
    gutter: true,
  },
});

type ContainerProps = ComponentProps<"div"> &
  VariantProps<typeof containerVariants>;

/** Centred, width-capped page gutter. */
export function Container({
  className,
  width,
  gutter,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(containerVariants({ width, gutter }), className)}
      {...props}
    />
  );
}

export type { ContainerProps };
