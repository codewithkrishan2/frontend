import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { ConnectionCard } from "@/components/scm/connection-card";
import { ProviderConnectCard } from "@/components/scm/provider-connect-card";
import {
  appRoutes,
  SCM_CONNECT_START_FAILED,
  scmConnectStartParams,
} from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import {
  isLiveConnection,
  needsReconnect,
  type ScmConnectionResponse,
  type ScmProviderResponse,
} from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import { scmConnectFailureMessage } from "@/lib/scm/presentation";
import { fetchScmConnections, fetchScmProviders } from "@/lib/scm/service";
import { Alert, Card, EmptyState, Separator, Stat } from "@/components/ui";

export const metadata: Metadata = {
  title: "Integrations",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Source-control connections hub.
 *
 * Two backend reads, issued together because neither depends on the other:
 * `GET /scm/providers` for what can be connected and `GET /scm/connections` for
 * what already is. Both are unpaginated arrays ordered server-side.
 *
 * The connection list includes `DISCONNECTED` rows — the backend keeps them for
 * history — so they are split out below rather than mixed into the live list.
 */
export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();

  if (!session) {
    redirect(appRoutes.login);
  }

  const params = await searchParams;

  let providers: ScmProviderResponse[];
  let connections: ScmConnectionResponse[];

  try {
    [providers, connections] = await Promise.all([
      fetchScmProviders(session.accessToken),
      fetchScmConnections(session.accessToken),
    ]);
  } catch (error) {
    if (error instanceof ApiError) {
      // Same reasoning as the dashboard: a Server Component cannot clear
      // cookies, so an unrecoverable 401 has to go through the sign-out handler
      // or middleware will bounce the user straight back here.
      if (error.isUnauthorized) {
        redirect(appRoutes.signOut);
      }

      return (
        <div className="flex flex-col gap-8">
          <IntegrationsHeader />
          <Alert tone="fail" title="Could not load your integrations">
            {error.message}
          </Alert>
        </div>
      );
    }

    throw error;
  }

  const live = connections.filter(isLiveConnection);
  const history = connections.filter(
    (connection) => !isLiveConnection(connection),
  );
  const attention = live.filter(needsReconnect);

  const liveCountByProviderCode = new Map<string, number>();
  for (const connection of live) {
    const key = connection.providerCode.toUpperCase();
    liveCountByProviderCode.set(
      key,
      (liveCountByProviderCode.get(key) ?? 0) + 1,
    );
  }

  const startFailure = readStartFailure(params);

  return (
    <div className="flex flex-col gap-10">
      <IntegrationsHeader />

      {/* Set by the connect Route Handler when it could not even reach the
          consent screen — distinct from a round trip that came back failed,
          which lands on /scm/connection-result instead. */}
      {startFailure ? (
        <Alert tone="fail" title="Could not start that connection">
          {scmConnectFailureMessage(startFailure.reason)}
          {startFailure.provider ? (
            <span className="mt-1 block text-xs opacity-80">
              Provider: {startFailure.provider}
            </span>
          ) : null}
        </Alert>
      ) : null}

      <Card padding="lg" className="edge-highlight">
        <dl className="grid gap-6 sm:grid-cols-3">
          <Stat label="Linked accounts" value={live.length} />
          <Stat label="Providers available" value={providers.length} />
          <Stat
            label="Needs attention"
            value={attention.length}
            hint={
              attention.length === 0
                ? "Every connection is healthy"
                : "Reconnect to restore access"
            }
            {...(attention.length > 0
              ? {
                  delta: {
                    value:
                      attention.length === 1
                        ? "1 connection"
                        : `${attention.length} connections`,
                    direction: "up" as const,
                    // More connections needing attention is bad, so "up" must
                    // not be coloured as an improvement.
                    positiveIsGood: false,
                  },
                }
              : {})}
          />
        </dl>
      </Card>

      <section aria-labelledby="connected-accounts">
        <SectionHeading
          id="connected-accounts"
          title="Connected accounts"
          description="Accounts CodeRev can read pull requests from."
        />

        {live.length === 0 ? (
          <Card padding="none" tone="flat" className="mt-5">
            <EmptyState
              title="No source control connected yet"
              description="Link a provider below and CodeRev will start reading its pull requests. You can connect more than one account per provider."
              icon={
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-8"
                >
                  <path d="M10 13.5a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.2 1.2" />
                  <path d="M14 10.5a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.2-1.2" />
                </svg>
              }
            />
          </Card>
        ) : (
          <div className="mt-5 flex flex-col gap-4">
            {live.map((connection) => (
              <ConnectionCard key={connection.id} connection={connection} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="available-providers">
        <SectionHeading
          id="available-providers"
          title="Available providers"
          description="Connecting opens the provider's consent screen. CodeRev only ever receives the scopes listed on each provider's page."
        />

        {providers.length === 0 ? (
          <Card padding="none" tone="flat" className="mt-5">
            <EmptyState
              title="No providers are configured"
              description="Providers are seeded server-side. Ask an administrator to enable GitHub or Bitbucket on this deployment."
            />
          </Card>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {providers.map((provider) => (
              <ProviderConnectCard
                key={provider.id}
                provider={provider}
                connectedCount={
                  liveCountByProviderCode.get(
                    provider.providerCode.toUpperCase(),
                  ) ?? 0
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Disconnected rows are kept by the backend rather than deleted, so they
          are shown — but folded away, since they are a record and not something
          to act on. */}
      {history.length > 0 ? (
        <section aria-labelledby="connection-history">
          <Separator soft />

          <details className="group mt-6">
            <summary className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-ink-100">
              <svg
                viewBox="0 0 16 16"
                aria-hidden
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5 transition-transform duration-200 group-open:rotate-90"
              >
                <path d="M6 3.5 10.5 8 6 12.5" />
              </svg>

              <span id="connection-history">
                Previously connected ({history.length})
              </span>
            </summary>

            <div className="mt-5 flex flex-col gap-4">
              {history.map((connection) => (
                <ConnectionCard key={connection.id} connection={connection} />
              ))}
            </div>
          </details>
        </section>
      ) : null}
    </div>
  );
}

function IntegrationsHeader() {
  return (
    <PageHeader
      eyebrow="Source control"
      title="Integrations"
      description="Connect the accounts CodeRev reviews code from. Credentials are held server-side and never reach your browser — disconnecting destroys them."
    />
  );
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 id={id} className="text-lg font-medium tracking-tight text-ink-50">
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

/**
 * Reads the connect-failure params, if this render is the result of one.
 *
 * `searchParams` values are `string | string[]` because a param can repeat, so
 * each is narrowed to the single-string case; a repeated param is treated as
 * absent rather than guessed at.
 */
function readStartFailure(
  params: Record<string, string | string[] | undefined>,
): { provider: string | undefined; reason: string | undefined } | null {
  if (
    single(params[scmConnectStartParams.outcome]) !== SCM_CONNECT_START_FAILED
  ) {
    return null;
  }

  return {
    provider: single(params[scmConnectStartParams.provider]),
    reason: single(params[scmConnectStartParams.reason]),
  };
}

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}
