import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva("relative rounded-lg border px-4 py-3 text-sm", {
  variants: {
    tone: {
      neutral: "border-border-strong bg-ink-800/50 text-ink-200",
      brand: "border-brand-500/30 bg-brand-500/10 text-brand-100",
      pass: "border-signal-pass/30 bg-signal-pass/10 text-signal-pass",
      warn: "border-signal-warn/30 bg-signal-warn/10 text-signal-warn",
      fail: "border-signal-fail/30 bg-signal-fail/10 text-signal-fail",
      info: "border-signal-info/30 bg-signal-info/10 text-signal-info",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

type AlertProps = ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    title?: string;
    icon?: ReactNode;
  };

export function Alert({
  className,
  tone,
  title,
  icon,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      // `fail` is the only tone that warrants interrupting a screen reader.
      role={tone === "fail" ? "alert" : "status"}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <div className="flex gap-3">
        {icon ? (
          <span className="mt-0.5 shrink-0" aria-hidden>
            {icon}
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          {title ? <p className="font-medium">{title}</p> : null}
          {children ? (
            <div className={cn("opacity-90", title && "mt-1")}>{children}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { alertVariants };
export type { AlertProps };
