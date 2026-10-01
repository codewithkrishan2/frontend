import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 select-none",
    "rounded-lg font-medium whitespace-nowrap",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out",
    "active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        /* Filled brand action. The inset highlight keeps it from looking flat. */
        primary: [
          "bg-brand-600 text-white",
          "shadow-[0_1px_0_0_oklch(1_0_0/0.18)_inset,0_8px_24px_-8px_oklch(0.55_0.225_278/0.7)]",
          "hover:bg-brand-500 hover:shadow-[0_1px_0_0_oklch(1_0_0/0.22)_inset,0_10px_30px_-8px_oklch(0.55_0.225_278/0.85)]",
        ],
        secondary: [
          "border border-border-strong bg-ink-800/80 text-ink-50",
          "hover:border-ink-600 hover:bg-ink-700/80",
        ],
        outline: [
          "border border-border-strong bg-transparent text-ink-100",
          "hover:border-ink-600 hover:bg-ink-800/60",
        ],
        ghost:
          "bg-transparent text-ink-200 hover:bg-ink-800/60 hover:text-ink-50",
        danger: [
          "border border-signal-fail/30 bg-signal-fail/15 text-signal-fail",
          "hover:bg-signal-fail/25",
        ],
        link: "bg-transparent text-brand-300 underline-offset-4 hover:text-brand-200 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[0.8125rem]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-[0.9375rem]",
        icon: "size-10",
        "icon-sm": "size-8",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner and blocks interaction. */
    loading?: boolean;
    /** Rendered before the label. Ignored while loading. */
    startIcon?: ReactNode;
    /** Rendered after the label. */
    endIcon?: ReactNode;
  };

export function Button({
  className,
  variant,
  size,
  block,
  loading = false,
  startIcon,
  endIcon,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : startIcon}
      {children}
      {endIcon}
    </button>
  );
}

export { buttonVariants };
export type { ButtonProps };
