import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border-strong bg-ink-800/70 text-ink-200",
        brand: "border-brand-500/30 bg-brand-500/12 text-brand-200",
        accent: "border-accent-500/30 bg-accent-500/12 text-accent-300",
        pass: "border-signal-pass/30 bg-signal-pass/12 text-signal-pass",
        warn: "border-signal-warn/30 bg-signal-warn/12 text-signal-warn",
        fail: "border-signal-fail/30 bg-signal-fail/12 text-signal-fail",
        info: "border-signal-info/30 bg-signal-info/12 text-signal-info",
        outline: "border-border-strong bg-transparent text-ink-300",
      },
      size: {
        sm: "px-2 py-0.5 text-[0.6875rem]",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "md",
    },
  },
);

type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
  );
}

export { badgeVariants };
export type { BadgeProps };
