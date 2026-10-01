import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const cardVariants = cva("relative rounded-xl border", {
  variants: {
    tone: {
      /** Default panel: sits just above the page background. */
      raised: "border-border bg-ink-900/70",
      /** Flatter, for dense groupings like tables. */
      flat: "border-border bg-ink-950/60",
      /** Frosted, for overlays on top of imagery or gradients. */
      glass: "border-border-strong glass",
      /** No chrome, for grouping only. */
      ghost: "border-transparent bg-transparent",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-5 sm:p-6",
      lg: "p-6 sm:p-8",
    },
    interactive: {
      true: [
        "transition-[border-color,background-color,transform,box-shadow] duration-300 ease-out",
        "hover:border-border-strong hover:bg-ink-850/80",
        "hover:shadow-[0_18px_50px_-24px_oklch(0_0_0/0.9)]",
      ],
      false: "",
    },
  },
  defaultVariants: {
    tone: "raised",
    padding: "md",
    interactive: false,
  },
});

type CardProps = ComponentProps<"div"> & VariantProps<typeof cardVariants>;

export function Card({
  className,
  tone,
  padding,
  interactive,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(cardVariants({ tone, padding, interactive }), className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      className={cn("font-medium tracking-tight text-ink-50", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center gap-3 pt-2", className)} {...props} />
  );
}

export { cardVariants };
export type { CardProps };
