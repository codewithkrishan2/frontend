import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { ConnectProviderButton } from "@/components/scm/connect-provider-button";
import { ConnectionCard } from "@/components/scm/connection-card";
import { ProviderTile } from "@/components/scm/provider-tile";
import { appRoutes } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import {
  isLiveConnection,
  type ScmConnectionResponse,
  type ScmProviderDetailResponse,
  type ScmProviderResponse,
} from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import {
  scmCodeLabel,
  scmProvider,
  scmProviderTypeLabel,
  scmScopeDescription,
} from "@/lib/scm/presentation";
import {
  fetchScmConnections,
  fetchScmProviderDetail,
  fetchScmProviders,
  findProviderByCode,
} from "@/lib/scm/service";
import {
  Alert,
  Badge,
  Card,
  CardDescription,
  CardTitle,
  EmptyState,
  Separator,
} from "@/components/ui";

type RouteParams = Promise<{ providerCode: string }>;

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { providerCode } = await params;
  // The real provider name needs an authenticated call, which metadata
  // generation should not be doing twice per render. The code is close enough
  // for a tab title on a noindex page.
  return { title: `${decodeURIComponent(providerCode)} integration` };
}

/**
 * One provider: what it can do, and what connecting to it grants.
 *
 * Routed by `providerCode` because `/integrations/GITHUB` is a better URL than a
 * surrogate id, but `GET /scm/providers/{providerId}` is keyed by the numeric
 * id — so the code has to be resolved first.
 *
 * Resolution falls back to the user's own connections if the provider is not in
 * the list. The list returns active providers only, while the detail endpoint
 * resolves regardless of the `active` flag; without the fallback, a provider
 * switched off after someone connected to it would 404 here even though their
 * connection is still listed on the hub.
 */
export default async function ProviderDetailPage({
  params,
}: {
  params: RouteParams;
}) {
  const session = await getSession();

  if (!session) {
    redirect(appRoutes.login);
  }

  const { providerCode: rawCode } = await params;
  const providerCode = decodeURIComponent(rawCode);

  let providers: ScmProviderResponse[];
  let connections: ScmConnectionResponse[];

  try {
    [providers, connections] = await Promise.all([
      fetchScmProviders(session.accessToken),
      fetchScmConnections(session.accessToken),
    ]);
  } catch (error) {
    return handleLoadError(error);
  }

  /*
   * Resolution and `notFound()` sit outside the try blocks on purpose.
   *
   * `notFound()` and `redirect()` work by throwing a sentinel error that the
   * framework catches. Calling either inside a `try` means our own `catch` sees
   * it first, and the status code gets lost on the way back out — the page
   * rendered the 404 body but answered HTTP 200. Keeping the call outside any
   * `try` lets the signal reach Next.js untouched.
   */
  const providerId =
    findProviderByCode(providers, providerCode)?.id ??
    connections.find(
      (connection) =>
        connection.providerCode.toUpperCase() === providerCode.toUpperCase(),
    )?.providerId;

  if (providerId === undefined) {
    notFound();
  }

  let detail: ScmProviderDetailResponse;

  try {
    detail = await fetchScmProviderDetail(session.accessToken, providerId);
  } catch (error) {
    return handleLoadError(error);
  }

  const { tagline } = scmProvider(detail.providerCode);
  const typeLabel = scmProviderTypeLabel(detail.providerType);

  const providerConnections = connections.filter(
    (connection) => connection.providerId === detail.id,
  );
  const liveConnections = providerConnections.filter(isLiveConnection);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={detail.providerName}
        description={tagline}
        backTo={{ href: appRoutes.integrations, label: "Integrations" }}
        actions={
          <ConnectProviderButton
            providerCode={detail.providerCode}
            label={liveConnections.length > 0 ? "Connect another" : "Connect"}
            variant={liveConnections.length > 0 ? "outline" : "primary"}
          />
        }
      />

      <Card padding="lg" className="edge-highlight">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ProviderTile providerCode={detail.providerCode} size="lg" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-md border border-border bg-ink-950/70 px-2 py-0.5 font-mono text-[0.8125rem] text-ink-200">
                {detail.providerCode}
              </code>

              {typeLabel ? (
                <Badge tone="outline" size="sm">
                  {typeLabel}
                </Badge>
              ) : null}

              {detail.active ? (
                <Badge tone="pass" size="sm">
                  Enabled
                </Badge>
              ) : (
                <Badge tone="warn" size="sm">
                  Disabled on this deployment
                </Badge>
              )}
            </div>

            {detail.apiBaseUrl ? (
              <p className="mt-2 truncate font-mono text-xs text-subtle-foreground">
                {detail.apiBaseUrl}
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Scopes first: it is the one thing on this page with a consequence for
          the user's own account, so it should not be below the feature matrix. */}
      <Card padding="lg">
        <CardTitle>Access you will be asked to grant</CardTitle>
        <CardDescription className="mt-1.5">
          These are the scopes CodeRev requests at the provider&apos;s consent
          screen. The provider is the authority on what they permit — the plain
          wording here is a summary.
        </CardDescription>

        <Separator soft className="my-5" />

        {detail.oauthScopes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This provider requests no scopes.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {detail.oauthScopes.map((scope) => {
              const description = scmScopeDescription(scope);

              return (
                <li key={scope} className="flex items-start gap-3">
                  <KeyGlyph />

                  <div className="min-w-0">
                    <p className="font-mono text-[0.8125rem] text-ink-100">
                      {scope}
                    </p>
                    {description ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {description}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* `items-start` matters here: the two lists are usually very uneven — one
          excluded capability against eleven supported ones — and the grid's
          default `stretch` would pad the short card out to match, leaving a tall
          empty panel. */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card padding="lg">
          <CardTitle>Supported</CardTitle>
          <CardDescription className="mt-1.5">
            What this provider can do once connected.
          </CardDescription>

          <Separator soft className="my-5" />

          <CapabilityList
            codes={detail.supportedCapabilities}
            tone="supported"
            emptyLabel="Nothing is declared supported yet."
          />
        </Card>

        <Card padding="lg">
          <CardTitle>Not supported</CardTitle>
          <CardDescription className="mt-1.5">
            Declared unavailable for this provider, so CodeRev will not attempt
            it.
          </CardDescription>

          <Separator soft className="my-5" />

          <CapabilityList
            codes={detail.unsupportedCapabilities}
            tone="unsupported"
            emptyLabel="Nothing is excluded — every capability is available."
          />
        </Card>
      </div>

      <Card padding="lg" tone="flat">
        <CardTitle className="text-base">Configured operations</CardTitle>
        <CardDescription className="mt-1.5">
          The provider calls that are wired up server-side. A capability can be
          supported in principle while its call is not yet configured, which is
          why both are listed.
        </CardDescription>

        <div className="mt-5 flex flex-wrap gap-2">
          {detail.configuredOperations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No operations are configured for this provider.
            </p>
          ) : (
            detail.configuredOperations.map((operation) => (
              <Badge key={operation} tone="neutral" size="sm">
                {scmCodeLabel(operation)}
              </Badge>
            ))
          )}
        </div>
      </Card>

      <section aria-labelledby="provider-connections">
        <h2
          id="provider-connections"
          className="text-lg font-medium tracking-tight text-ink-50"
        >
          Your {detail.providerName} accounts
        </h2>

        {providerConnections.length === 0 ? (
          <Card padding="none" tone="flat" className="mt-5">
            <EmptyState
              title={`No ${detail.providerName} account linked`}
              description="Connect one and it will appear here with its status and permissions."
              action={
                <ConnectProviderButton
                  providerCode={detail.providerCode}
                  size="sm"
                />
              }
            />
          </Card>
        ) : (
          <div className="mt-5 flex flex-col gap-4">
            {providerConnections.map((connection) => (
              <ConnectionCard key={connection.id} connection={connection} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * Turns a failed load into the right outcome for its status.
 *
 * Called from a `catch`, never from inside a `try`, so the `redirect` and
 * `notFound` signals it throws propagate to the framework rather than being
 * swallowed by the handler that invoked it.
 *
 * A 404 from the detail endpoint is reachable even after the id resolved: the
 * provider row can be removed between the list call and this one.
 */
function handleLoadError(error: unknown) {
  if (!(error instanceof ApiError)) {
    throw error;
  }

  if (error.isUnauthorized) {
    // A Server Component cannot clear cookies, so an unrecoverable 401 goes via
    // the sign-out handler or middleware bounces the user straight back.
    redirect(appRoutes.signOut);
  }

  if (error.isNotFound) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Provider"
        backTo={{ href: appRoutes.integrations, label: "Integrations" }}
      />
      <Alert tone="fail" title="Could not load this provider">
        {error.message}
      </Alert>
    </div>
  );
}

function CapabilityList({
  codes,
  tone,
  emptyLabel,
}: {
  codes: readonly string[];
  tone: "supported" | "unsupported";
  emptyLabel: string;
}) {
  if (codes.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {codes.map((code) => (
        <li key={code} className="flex items-center gap-2.5 text-sm">
          {tone === "supported" ? <CheckGlyph /> : <CrossGlyph />}
          <span
            className={
              tone === "supported" ? "text-ink-200" : "text-subtle-foreground"
            }
          >
            {scmCodeLabel(code)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0 text-signal-pass"
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

function CrossGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      className="size-4 shrink-0 text-ink-600"
    >
      <path d="M4.5 4.5l7 7" />
      <path d="M11.5 4.5l-7 7" />
    </svg>
  );
}

function KeyGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 size-4 shrink-0 text-brand-300"
    >
      <circle cx="5.5" cy="10.5" r="2.5" />
      <path d="M7.5 8.5 12 4" />
      <path d="M10 2.5 13.5 6" />
    </svg>
  );
}
