import Link from "next/link";
import type { ReactNode } from "react";

import { ConnectProviderButton } from "@/components/scm/connect-provider-button";
import { ConnectionStatusBadge } from "@/components/scm/connection-status-badge";
import { DisconnectConnection } from "@/components/scm/disconnect-connection";
import { ProviderTile } from "@/components/scm/provider-tile";
import { Alert, Avatar, buttonVariants, Card, Separator } from "@/components/ui";
import { appRoutes } from "@/lib/api/endpoints";
import { type ScmConnectionResponse } from "@/lib/api/types";
import {
  formatScmDate,
  formatScmDateTime,
  scmStatus,
  tokenExpiryState,
} from "@/lib/scm/presentation";
import { cn } from "@/lib/utils";

type ConnectionCardProps = {
  connection: ScmConnectionResponse;
};

/**
 * One linked provider account.
 *
 * Reads as an account first and a record second: the provider avatar and handle
 * lead, because "which GitHub account is this?" is the question a user actually
 * arrives with. Timestamps and the external id follow underneath for the times
 * they are needed.
 *
 * A `DISCONNECTED` connection is still rendered — the backend keeps the row for
 * history and returns it in the list — but dimmed, with disconnect removed and
 * reconnect offered instead.
 */
export function ConnectionCard({ connection }: ConnectionCardProps) {
  const status = scmStatus(connection.connectionStatus);
  const disconnected = connection.connectionStatus === "DISCONNECTED";
  const expiry = tokenExpiryState(connection.tokenExpiry);

  const accountLabel = connection.displayName ?? connection.externalAccountName;

  return (
    <Card
      padding="lg"
      className={cn(
        "transition-opacity duration-300",
        disconnected && "opacity-65",
      )}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {/* Avatar with the provider mark pinned to its corner, so the account
              and where it lives are one glance rather than two. */}
          <span className="relative shrink-0">
            <Avatar
              name={accountLabel}
              src={connection.avatarUrl ?? undefined}
              size="lg"
            />
            <ProviderTile
              providerCode={connection.providerCode}
              size="sm"
              className="absolute -right-1.5 -bottom-1.5 size-6 rounded-md ring-2 ring-ink-900"
            />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-medium tracking-tight text-ink-50">
                {accountLabel}
              </h3>
              <ConnectionStatusBadge status={connection.connectionStatus} />
            </div>

            <p className="mt-1 truncate text-sm text-muted-foreground">
              <span className="text-ink-300">
                {connection.externalAccountName}
              </span>
              <span aria-hidden> · </span>
              <Link
                href={appRoutes.integration(connection.providerCode)}
                className="underline-offset-4 transition-colors hover:text-ink-100 hover:underline"
              >
                {connection.providerName}
              </Link>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* The entry point into repository browsing.
              Offered only on a live connection, because browsing needs
              credentials this connection still has — a disconnected row has had
              them destroyed, and a reconnect-required one would fail on the
              first provider call. Carrying the connection id means the
              repository page reads through *this* account rather than defaulting
              to the newest one, which matters once two are linked. */}
          {disconnected || status.reconnectable ? null : (
            <Link
              href={appRoutes.repositories(connection.providerCode, {
                connection: connection.id,
              })}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Browse repositories
            </Link>
          )}

          {status.reconnectable ? (
            <ConnectProviderButton
              providerCode={connection.providerCode}
              label="Reconnect"
              variant={disconnected ? "outline" : "secondary"}
              size="sm"
            />
          ) : null}

          {/* Disconnecting an already-disconnected row is a no-op the backend
              treats as idempotent, so the control is simply not offered. */}
          {disconnected ? null : (
            <DisconnectConnection
              connectionId={connection.id}
              accountLabel={accountLabel}
              providerName={connection.providerName}
            />
          )}
        </div>
      </div>

      {/* Only states with a consequence get an explanation. Narrating "Active"
          would be noise on the common case. */}
      {status.reconnectable ? (
        <Alert
          tone={status.tone === "outline" ? "neutral" : status.tone}
          className="mt-5"
        >
          {status.description}
        </Alert>
      ) : null}

      <Separator soft className="my-5" />

      <dl className="grid gap-5 sm:grid-cols-3">
        <Meta label="Connected">{formatScmDate(connection.connectedAt)}</Meta>

        <Meta label="Last used">
          {formatScmDate(connection.lastUsedAt) ?? (
            <span className="text-subtle-foreground">Not yet used</span>
          )}
        </Meta>

        <Meta label="Token">
          {expiry === "none" ? (
            <span className="text-subtle-foreground">Does not expire</span>
          ) : (
            <span
              className={cn(
                expiry === "expired" && "text-signal-fail",
                expiry === "expiring" && "text-signal-warn",
              )}
              title={formatScmDateTime(connection.tokenExpiry) ?? undefined}
            >
              {expiry === "expired" ? "Expired " : "Expires "}
              {formatScmDate(connection.tokenExpiry)}
            </span>
          )}
        </Meta>
      </dl>

      <dl className="mt-5">
        <Meta label="Account ID" mono>
          {connection.externalAccountId}
        </Meta>
      </dl>
    </Card>
  );
}

function Meta({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wide text-subtle-foreground uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1.5 truncate text-sm text-ink-200",
          mono && "font-mono text-[0.8125rem]",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

export type { ConnectionCardProps };
