import type { ScmConnectionStatus } from "@/lib/api/types";

/**
 * Turning SCM enum values into something a person can read.
 *
 * Kept out of the components so the wording for a status or a capability lives
 * in one place, and deliberately free of component imports so this module stays
 * usable from anywhere.
 *
 * Every lookup here falls back rather than throwing. Providers are seeded from
 * `resources/scm/seed/*.json`, so a new provider code or a new scope string can
 * appear without a frontend release, and an unknown value should degrade to a
 * tidy humanised label instead of blanking the page.
 */

/** The `Badge` / `Alert` tones this module hands back. */
export type ScmTone = "pass" | "warn" | "fail" | "neutral" | "outline";

/* ------------------------------------------------------------------------- *
 * Connection status
 * ------------------------------------------------------------------------- */

export type ScmStatusPresentation = {
  label: string;
  tone: ScmTone;
  /** One sentence explaining the state and its way out. */
  description: string;
  /** Whether re-running consent is the fix. Drives the Reconnect affordance. */
  reconnectable: boolean;
};

const statusPresentation: Record<ScmConnectionStatus, ScmStatusPresentation> = {
  ACTIVE: {
    label: "Active",
    tone: "pass",
    description: "Connected and ready to use.",
    reconnectable: false,
  },
  EXPIRED: {
    label: "Token expired",
    tone: "warn",
    description:
      "The access token aged out. Reconnect to issue a fresh one — your repositories are untouched.",
    reconnectable: true,
  },
  REVOKED: {
    label: "Access revoked",
    tone: "fail",
    description:
      "Consent was withdrawn at the provider, so the stored token no longer works. Reconnect to grant access again.",
    reconnectable: true,
  },
  DISCONNECTED: {
    label: "Disconnected",
    tone: "outline",
    description:
      "The stored credentials were destroyed. This entry is kept for history only.",
    reconnectable: true,
  },
  ERROR: {
    label: "Error",
    tone: "fail",
    description:
      "The provider rejected repeated calls, so this connection is being held aside. Reconnect to re-establish it.",
    reconnectable: true,
  },
};

/**
 * Presentation for a connection status.
 *
 * Takes a plain string because `connectionStatus` is serialised as
 * `status.name()` rather than a typed enum, so an unrecognised value is
 * possible if the backend gains a state before this app does.
 */
export function scmStatus(status: string): ScmStatusPresentation {
  return (
    statusPresentation[status as ScmConnectionStatus] ?? {
      label: humanise(status),
      tone: "neutral",
      description: "This connection is in a state this app does not yet know.",
      reconnectable: true,
    }
  );
}

/* ------------------------------------------------------------------------- *
 * Providers
 * ------------------------------------------------------------------------- */

export type ScmProviderPresentation = {
  /** Short line under the provider name on a connect card. */
  tagline: string;
  /** Gradient for the provider tile, so the two are instantly distinguishable. */
  tileClassName: string;
};

const providerPresentation: Record<string, ScmProviderPresentation> = {
  GITHUB: {
    tagline:
      "Pull requests, reviews and checks across your github.com repositories.",
    tileClassName:
      "bg-gradient-to-br from-ink-700 to-ink-900 text-ink-50 ring-1 ring-white/10",
  },
  BITBUCKET: {
    tagline: "Workspaces, repositories and pull requests on Bitbucket Cloud.",
    tileClassName:
      "bg-gradient-to-br from-signal-info/30 to-brand-800/40 text-accent-300 ring-1 ring-signal-info/25",
  },
};

export function scmProvider(providerCode: string): ScmProviderPresentation {
  return (
    providerPresentation[providerCode.toUpperCase()] ?? {
      tagline: "Connect this provider to review its pull requests.",
      tileClassName:
        "bg-gradient-to-br from-brand-800/50 to-ink-900 text-brand-200 ring-1 ring-brand-500/25",
    }
  );
}

/** How the provider is hosted, as a short label. `null` renders as nothing. */
export function scmProviderTypeLabel(
  providerType: string | null,
): string | null {
  if (providerType === "CLOUD") return "Cloud";
  if (providerType === "SELF_HOSTED") return "Self-hosted";
  return providerType ? humanise(providerType) : null;
}

/* ------------------------------------------------------------------------- *
 * Capabilities, operations and scopes
 * ------------------------------------------------------------------------- */

/**
 * Labels for `ScmCapabilityCode` and `ScmOperationCode`.
 *
 * One map covers both because the two enums overlap on every value except
 * `GET_CURRENT_ACCOUNT`, and duplicating the wording would let the two drift.
 */
const codeLabels: Record<string, string> = {
  GET_CURRENT_ACCOUNT: "Identify your account",
  LIST_REPOSITORIES: "List repositories",
  GET_REPOSITORY: "Read a repository",
  LIST_PULL_REQUESTS: "List pull requests",
  GET_PULL_REQUEST: "Read a pull request",
  GET_PULL_REQUEST_FILES: "Read changed files",
  GET_PULL_REQUEST_DIFF: "Read diffs",
  CREATE_WEBHOOK: "Create webhooks",
  DELETE_WEBHOOK: "Remove webhooks",
  CREATE_PR_COMMENT: "Comment on pull requests",
  CREATE_PR_REVIEW: "Submit reviews",
  OAUTH_TOKEN_REFRESH: "Refresh tokens silently",
  WEBHOOK_SIGNATURE_VERIFICATION: "Verify webhook signatures",
};

export function scmCodeLabel(code: string): string {
  return codeLabels[code] ?? humanise(code);
}

/**
 * Plain-English meaning of an OAuth scope.
 *
 * Scopes are provider-defined strings straight from the seed configuration, so
 * this is a best-effort gloss — the raw scope is always shown alongside it.
 */
const scopeDescriptions: Record<string, string> = {
  // GitHub
  repo: "Read and write repository content",
  "read:user": "Read your profile",
  "user:email": "Read your email addresses",
  "admin:repo_hook": "Manage repository webhooks",
  // Bitbucket
  account: "Read your account",
  repository: "Read repositories",
  pullrequest: "Read pull requests",
  "pullrequest:write": "Comment on and review pull requests",
  webhook: "Manage webhooks",
};

export function scmScopeDescription(scope: string): string | undefined {
  return scopeDescriptions[scope];
}

/* ------------------------------------------------------------------------- *
 * Dates
 * ------------------------------------------------------------------------- */

/**
 * Formatting is pinned to `en-GB` and UTC on purpose.
 *
 * These values are rendered by Server Components, so a locale- or
 * timezone-dependent format would produce different output on the server than
 * in the browser and trip hydration. Same rule as `formatJoinDate` on the
 * dashboard.
 */
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

/** `"2024-05-01T12:00:00Z"` -> `"1 May 2024"`. Null-tolerant. */
export function formatScmDate(iso: string | null): string | null {
  const date = parseInstant(iso);
  return date ? dateFormatter.format(date) : null;
}

/** `"2024-05-01T12:00:00Z"` -> `"1 May 2024, 12:00 UTC"`. Null-tolerant. */
export function formatScmDateTime(iso: string | null): string | null {
  const date = parseInstant(iso);
  return date ? dateTimeFormatter.format(date) : null;
}

/**
 * Whether a token expiry is in the past, or close enough to warn about.
 *
 * `null` expiry means the token does not expire, which is a normal state for
 * some providers rather than something to flag.
 */
export function tokenExpiryState(
  tokenExpiry: string | null,
): "none" | "valid" | "expiring" | "expired" {
  const date = parseInstant(tokenExpiry);
  if (!date) return "none";

  const remainingMs = date.getTime() - Date.now();
  if (remainingMs <= 0) return "expired";

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return remainingMs <= sevenDaysMs ? "expiring" : "valid";
}

function parseInstant(iso: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * `SCREAMING_SNAKE_CASE` -> `"Screaming snake case"`.
 *
 * The fallback for every lookup above, so an unmapped backend enum value still
 * reads as a label rather than as database shouting.
 */
function humanise(value: string): string {
  const words = value.toLowerCase().replace(/[_-]+/g, " ").trim();
  if (!words) return value;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/* ------------------------------------------------------------------------- *
 * Failure wording
 * ------------------------------------------------------------------------- */

/**
 * Explains why a connection attempt never reached the provider.
 *
 * `reason` is a `ScmErrorCode` carried on the redirect from
 * `/api/scm/connect/[providerCode]`. Only the codes that endpoint can realistically
 * produce are spelled out; anything else falls back, because a wrong-but-specific
 * explanation is worse than an honest vague one.
 *
 * Several of these are server misconfiguration rather than anything the user did,
 * so the wording says so instead of implying they can fix it by trying again.
 */
const connectFailureMessages: Record<string, string> = {
  SCM_PROVIDER_NOT_FOUND: "That provider is not available on this deployment.",
  SCM_PROVIDER_INACTIVE:
    "That provider has been switched off by an administrator.",
  SCM_PROVIDER_CONFIGURATION_INVALID:
    "That provider is misconfigured on the server, so consent could not be requested.",
  SCM_SECRET_NOT_FOUND:
    "The server is missing the OAuth client credentials for that provider.",
  SCM_SECRET_STORAGE_FAILED:
    "The server could not read its stored credentials for that provider.",
  SCM_PROVIDER_API_ERROR:
    "The provider rejected the request. Try again shortly.",
  SCM_PROVIDER_RATE_LIMITED:
    "The provider is rate-limiting this app right now. Try again in a few minutes.",
};

export function scmConnectFailureMessage(reason: string | undefined): string {
  if (reason && connectFailureMessages[reason]) {
    return connectFailureMessages[reason];
  }

  return "The connection could not be started. Try again, and if it keeps failing the provider may be misconfigured.";
}

/**
 * Explains the outcome of a completed provider round trip.
 *
 * `status` is one of the three literals `ScmOAuthCallbackController` redirects
 * with. It deliberately carries no detail — the controller keeps diagnostics in
 * its logs rather than putting them in a URL — so `failed` cannot be more
 * specific than this.
 */
export function scmConnectionResultMessage(status: string): {
  tone: ScmTone;
  title: string;
  description: string;
} {
  if (status === "success") {
    return {
      tone: "pass",
      title: "Connected",
      description:
        "The account is linked and its credentials are stored. CodeRev can now read its pull requests.",
    };
  }

  if (status === "denied") {
    return {
      tone: "warn",
      title: "Consent was declined",
      description:
        "Nothing was changed. CodeRev needs access to read pull requests, so connect again when you are ready.",
    };
  }

  return {
    tone: "fail",
    title: "The connection could not be completed",
    description:
      "The provider redirect came back, but the exchange failed — often because the consent window sat open for more than ten minutes and the request expired. Try connecting again.",
  };
}
