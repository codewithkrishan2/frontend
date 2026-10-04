import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ConnectProviderButton } from "@/components/scm/connect-provider-button";
import { ConnectionCard } from "@/components/scm/connection-card";
import {
  appRoutes,
  isScmConnectionResultStatus,
  scmConnectionResultParams,
  type ScmConnectionResultStatus,
} from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { isLiveConnection, type ScmConnectionResponse } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import {
  scmConnectionResultMessage,
  type ScmTone,
} from "@/lib/scm/presentation";
import { fetchScmConnections } from "@/lib/scm/service";
import { Alert, buttonVariants, Card } from "@/components/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Connection result",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Where the backend sends the browser after a provider consent round trip.
 *
 * This path is a contract: `ScmOAuthCallbackController.RESULT_PATH` is
 * `/scm/connection-result`, appended to `app.frontend-url`, and every branch of
 * that controller ends in a redirect here with `?provider=&status=`. Renaming
 * the route strands every connection attempt on a 404.
 *
 * The redirect itself is the completion signal — there is no polling endpoint
 * and nothing to wait for. By the time this renders the connection has already
 * been written, so a plain read of `GET /scm/connections` shows it.
 *
 * `status` is one of three literals and carries no detail: the controller keeps
 * diagnostics in its logs and deliberately puts no token, code or error message
 * in the URL.
 *
 * Reachable with a session because the hop back from the provider is a top-level
 * GET navigation, which `sameSite: "lax"` cookies are sent on.
 */
export default async function ScmConnectionResultPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();

  if (!session) {
    redirect(appRoutes.login);
  }

  const params = await searchParams;

  const providerCode = single(params[scmConnectionResultParams.provider]);
  const rawStatus = single(params[scmConnectionResultParams.status]);

  // An unrecognised or absent status means something reached this page that the
  // controller did not send. Treating it as a failure is the safe reading — the
  // alternative is implying a connection succeeded when nothing says it did.
  const status: ScmConnectionResultStatus = isScmConnectionResultStatus(
    rawStatus,
  )
    ? rawStatus
    : "failed";

  const result = scmConnectionResultMessage(status);

  // Only worth a round trip when there should be something new to show.
  let connection: ScmConnectionResponse | null = null;
  let loadError: string | null = null;

  if (status === "success") {
    try {
      const connections = await fetchScmConnections(session.accessToken);

      // The list is ordered newest-connected first, so the first live match for
      // this provider is the one that just completed. Matching on provider
      // rather than taking the head avoids showing an unrelated account if the
      // user has several.
      connection =
        connections.find(
          (candidate) =>
            isLiveConnection(candidate) &&
            (!providerCode ||
              candidate.providerCode.toUpperCase() ===
                providerCode.toUpperCase()),
        ) ?? null;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isUnauthorized) {
          redirect(appRoutes.signOut);
        }

        // The connection was still created — the callback had already committed
        // before it redirected here. Only the confirmation read failed, so say
        // that rather than casting doubt on the connection.
        loadError = error.message;
      } else {
        throw error;
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-4 sm:py-10">
      {/* Centred, with a medallion: this is a terminal state the user arrived at
          from another origin, so it should read as an outcome rather than as
          another page of the app. */}
      <div className="flex flex-col items-center text-center">
        <ResultMedallion tone={result.tone} />

        <p className="mt-6 text-xs font-medium tracking-wider text-brand-300 uppercase">
          Source control
          {providerCode ? (
            <span className="text-subtle-foreground"> · {providerCode}</span>
          ) : null}
        </p>

        <h1 className="mt-2 text-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {result.title}
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {result.description}
        </p>
      </div>

      {loadError ? (
        <Alert tone="warn" title="Connected, but the list could not be read">
          {loadError}
        </Alert>
      ) : null}

      {connection ? (
        <ConnectionCard connection={connection} />
      ) : status === "success" ? (
        <Card padding="lg" tone="flat">
          <p className="text-sm text-muted-foreground">
            The connection was stored. Open integrations to see it.
          </p>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={appRoutes.integrations}
          className={cn(buttonVariants({ variant: "primary" }))}
        >
          {status === "success" ? "Done" : "Back to integrations"}
        </Link>

        {/* Retrying needs a provider to retry, and `provider` is absent only if
            something other than the controller sent the browser here. */}
        {status !== "success" && providerCode ? (
          <ConnectProviderButton
            providerCode={providerCode}
            label="Try again"
            variant="outline"
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * The outcome as a glyph in a tinted ring.
 *
 * `aria-hidden`, because the heading immediately below says the same thing in
 * words — announcing it twice would be noise, and colour is never the only
 * carrier of the meaning.
 */
function ResultMedallion({ tone }: { tone: ScmTone }) {
  const shared = "flex size-14 items-center justify-center rounded-full ring-1";

  if (tone === "pass") {
    return (
      <span
        aria-hidden
        className={cn(
          shared,
          "bg-signal-pass/12 text-signal-pass ring-signal-pass/30",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-7"
        >
          <path d="M5 12.5 10 17.5 19 7" />
        </svg>
      </span>
    );
  }

  if (tone === "warn") {
    return (
      <span
        aria-hidden
        className={cn(
          shared,
          "bg-signal-warn/12 text-signal-warn ring-signal-warn/30",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="size-7"
        >
          <path d="M12 7v7" />
          <path d="M12 17.5v.01" />
        </svg>
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        shared,
        "bg-signal-fail/12 text-signal-fail ring-signal-fail/30",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="size-7"
      >
        <path d="M7 7l10 10" />
        <path d="M17 7 7 17" />
      </svg>
    </span>
  );
}

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}
