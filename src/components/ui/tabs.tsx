"use client";

import { useId, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: ReactNode;
  content: ReactNode;
};

type TabsProps = {
  items: readonly TabItem[];
  defaultTabId?: string;
  /** Called on change, for callers that want to react to tab switches. */
  onTabChange?: (id: string) => void;
  className?: string;
  listClassName?: string;
  panelClassName?: string;
};

/**
 * Tabs following the WAI-ARIA tabs pattern: arrow keys move between tabs,
 * Home/End jump to the ends, and only the active tab is in the tab order.
 */
export function Tabs({
  items,
  defaultTabId,
  onTabChange,
  className,
  listClassName,
  panelClassName,
}: TabsProps) {
  const baseId = useId();
  const firstId = items[0]?.id ?? "";
  const [activeId, setActiveId] = useState(defaultTabId ?? firstId);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeIndex = Math.max(
    items.findIndex((item) => item.id === activeId),
    0,
  );
  const activeItem = items[activeIndex];

  function select(id: string) {
    setActiveId(id);
    onTabChange?.(id);
  }

  function focusTab(index: number) {
    const item = items[index];
    if (!item) return;
    select(item.id);
    tabRefs.current[item.id]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const lastIndex = items.length - 1;

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusTab(activeIndex === lastIndex ? 0 : activeIndex + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusTab(activeIndex === 0 ? lastIndex : activeIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusTab(0);
        break;
      case "End":
        event.preventDefault();
        focusTab(lastIndex);
        break;
      default:
        break;
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        role="tablist"
        onKeyDown={onKeyDown}
        className={cn(
          "no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-ink-900/50 p-1",
          listClassName,
        )}
      >
        {items.map((item) => {
          const isActive = item.id === activeId;

          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => select(item.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-200",
                isActive
                  ? "bg-ink-800 text-ink-50 shadow-[0_1px_0_0_oklch(1_0_0/0.1)_inset]"
                  : "text-muted-foreground hover:text-ink-200",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {activeItem ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.id}`}
          aria-labelledby={`${baseId}-tab-${activeItem.id}`}
          tabIndex={0}
          className={cn("mt-4", panelClassName)}
        >
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
}

export type { TabsProps };
