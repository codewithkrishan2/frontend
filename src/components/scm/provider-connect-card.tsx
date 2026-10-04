import Link from "next/link";

import { ConnectProviderButton } from "@/components/scm/connect-provider-button";
import { ProviderTile } from "@/components/scm/provider-tile";
import { Badge, Card } from "@/components/ui";
import { appRoutes } from "@/lib/api/endpoints";
import type { ScmProviderResponse } from "@/lib/api/types";
import { scmProvider, scmProviderTypeLabel } from "@/lib/scm/presentation";

type ProviderConnectCardProps = {
  provider: ScmProviderResponse;
  /** How many live connections the user already has to this provider. */
  connectedCount: number;
};

/**
 * One provider, offered for connection.
 *
 * Still shown when the user already has a connection, because providers support
 * several accounts: the backend keys connections on
 * `(userId, providerId, externalAccountId)`, so consenting as a second account
 * adds a connection rather than replacing the first. The button says "Connect
 * another" in that case so the outcome is not a surprise.
 */
export function ProviderConnectCard({
  provider,
  connectedCount,
}: ProviderConnectCardProps) {
  const { tagline } = scmProvider(provider.providerCode);
  const typeLabel = scmProviderTypeLabel(provider.providerType);
  const connected = connectedCount > 0;

  return (
    <Card
      interactive
      padding="lg"
      className="flex flex-col gap-5 bg-ink-900/60"
    >
      <div className="flex items-start justify-between gap-4">
        <ProviderTile providerCode={provider.providerCode} size="lg" />

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {connected ? (
            <Badge tone="pass" size="sm">
              {connectedCount === 1
                ? "1 account linked"
                : `${connectedCount} accounts linked`}
            </Badge>
          ) : null}

          {typeLabel ? (
            <Badge tone="outline" size="sm">
              {typeLabel}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-base font-medium tracking-tight text-ink-50">
          {provider.providerName}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {tagline}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <ConnectProviderButton
          providerCode={provider.providerCode}
          label={connected ? "Connect another" : "Connect"}
          variant={connected ? "outline" : "primary"}
          size="sm"
        />

        <Link
          href={appRoutes.integration(provider.providerCode)}
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-ink-100 hover:underline"
        >
          Permissions
        </Link>
      </div>
    </Card>
  );
}

export type { ProviderConnectCardProps };
