import Link from "next/link";

import { Avatar } from "@/components/ui";
import type { ScmConnectionResponse } from "@/lib/api/types";
import { connectionLabel } from "@/lib/repositories/presentation";
import { cn } from "@/lib/utils";

type ConnectionSwitcherProps = {
  connections: readonly ScmConnectionResponse[];
  activeId: number;
  /** Builds the href for switching to a connection. */
  hrefFor: (connectionId: number) => string;
};

/**
 * Switches between accounts linked on the same provider.
 *
 * **Renders nothing when there is only one connection**, which is the common
 * case. A picker with a single option is noise that implies a choice the user
 * does not have — and the pages default to the newest live connection, so the
 * control is only ever needed once a second account exists.
 *
 * Links rather than a `<select>`: each account is a distinct URL, so switching
 * should be shareable and reachable with the back button, and it needs no client
 * JavaScript. A select would require an onChange handler and therefore a client
 * component, for a list that is almost always two items long.
 *
 * Switching deliberately drops the current page and search. They describe a
 * position in *this* account's repositories, and carrying page 4 across to a
 * different account would land on an unrelated page — or an empty one.
 */
export function ConnectionSwitcher({
  connections,
  activeId,
  hrefFor,
}: ConnectionSwitcherProps) {
  if (connections.length <= 1) return null;

  return (
    <nav aria-label="Linked accounts" className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-subtle-foreground">Account</span>

      {connections.map((connection) => {
        const active = connection.id === activeId;
        const label = connectionLabel(connection);

        return (
          <Link
            key={connection.id}
            href={hrefFor(connection.id)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-colors",
              active
                ? "border-brand-500/40 bg-brand-500/12 text-brand-100"
                : "border-border-strong bg-transparent text-ink-300 hover:border-ink-600 hover:text-ink-100",
            )}
          >
            <Avatar
              name={label}
              src={connection.avatarUrl ?? undefined}
              size="xs"
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export type { ConnectionSwitcherProps };
