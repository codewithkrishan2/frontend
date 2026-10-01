"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Modal built on the native `<dialog>` element, which gives us the top layer,
 * focus trapping and Escape handling without a dependency.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (open && !node.open) {
      node.showModal();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  // Prevent background scroll while the modal is up.
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      // `cancel` covers Escape, which does not fire a click.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      // Clicking the backdrop targets the dialog element itself.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      aria-describedby={description ? "dialog-description" : undefined}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] max-w-lg rounded-xl border border-border-strong bg-ink-900 p-0 text-ink-100",
        "shadow-[0_40px_120px_-30px_oklch(0_0_0/0.95)]",
        "backdrop:bg-ink-1000/70 backdrop:backdrop-blur-sm",
        className,
      )}
    >
      <div className="p-5 sm:p-6">
        <h2
          id="dialog-title"
          className="text-lg font-medium tracking-tight text-ink-50"
        >
          {title}
        </h2>

        {description ? (
          <p
            id="dialog-description"
            className="mt-1.5 text-sm text-muted-foreground"
          >
            {description}
          </p>
        ) : null}

        {children ? <div className="mt-5">{children}</div> : null}

        {footer ? (
          <div className="mt-6 flex items-center justify-end gap-3">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}

export type { DialogProps };
