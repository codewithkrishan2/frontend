import Link from "next/link";

import { Alert, buttonVariants } from "@/components/ui";
import { appRoutes } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import {
  failureSuggestsReconnect,
  repositoryFailureMessage,
} from "@/lib/repositories/presentation";

type RepositoryErrorProps = {
  title: string;
  error: ApiError;
};

/**
 * The error state for every repository and pull-request screen.
 *
 * Shared because all six reads fail in the same handful of ways, and because the
 * useful part of the message is not the one the backend sends. Backend messages
 * are written for an operator reading a log — `"providerCode=GITHUB
 * operationCode=LIST_REPOSITORIES status=403"` — so the code on `errors.code` is
 * translated to something a user can act on, and the backend's own text is kept
 * only as a fallback for codes this app has not seen.
 *
 * **Rate limiting is the case that justifies this component.** A provider
 * refusing us for a few minutes is the single most likely failure on these
 * screens, it fixes itself, and the alternative — a bare 500 page — tells the
 * user nothing. So it gets a `warn` tone and a "wait a few minutes" message
 * rather than being lumped in with real faults.
 *
 * Where a failure means the connection itself needs re-establishing, the
 * integrations hub is offered instead of a retry, which would not help.
 */
export function RepositoryError({ title, error }: RepositoryErrorProps) {
  const reconnect = failureSuggestsReconnect(error.code);
  const rateLimited = error.code === "SCM_PROVIDER_RATE_LIMITED";

  return (
    <Alert
      tone={rateLimited ? "warn" : reconnect ? "warn" : "fail"}
      title={title}
    >
      {repositoryFailureMessage(error.code, error.message)}

      {/* An anchor styled as a button, matching ConnectProviderButton: this is a
          navigation, so it should be a link for middle-click, copy-link and
          keyboard behaviour rather than a button that happens to navigate. */}
      {reconnect ? (
        <div className="mt-4">
          <Link
            href={appRoutes.integrations}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Manage connections
          </Link>
        </div>
      ) : null}

      {/* The stable code, shown small. Not decoration: it is what a user can
          quote in a support request, and what distinguishes two failures whose
          wording we have deliberately kept vague. */}
      {error.code ? (
        <p className="mt-3 font-mono text-xs opacity-70">{error.code}</p>
      ) : null}
    </Alert>
  );
}
