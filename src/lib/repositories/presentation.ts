import {
  isLiveConnection,
  type FileChangeType,
  type PullRequestState,
  type RepositoryVisibility,
  type ScmConnectionResponse,
} from "@/lib/api/types";

/**
 * Wording, tones and small derivations for repository and pull-request screens.
 *
 * Separate from `lib/scm/presentation.ts` rather than appended to it, because
 * the two describe different things: that module is about the state of a
 * *connection*, this one about the state of *provider resources read through*
 * one. Keeping them apart means the SCM feature's wording is not quietly
 * reshaped by a repository need.
 *
 * Follows the same rules as that module, and for the same reasons: every lookup
 * falls back rather than throwing, since backend enums can gain values without a
 * frontend release, and dates are formatted with a pinned locale and UTC because
 * these render in Server Components, where a locale-dependent format would
 * differ between server and browser and trip hydration.
 */

/**
 * The `Badge` and `Alert` tones this module hands back.
 *
 * Broader than `lib/scm/presentation.ts`'s `ScmTone`, which covers only the five
 * tones connection statuses need. These screens need `brand` and `info` as well:
 * a merged pull request and a renamed file are neither successes nor failures,
 * and forcing them into the pass/warn/fail scale would make a repository's
 * ordinary history look like a problem report.
 *
 * Declared here rather than imported from the `Badge` component, for the same
 * reason the SCM module does it: keeping this file free of component imports
 * means it stays usable from anywhere, including code that never renders.
 */
export type RepositoryTone =
  | "neutral"
  | "brand"
  | "accent"
  | "pass"
  | "warn"
  | "fail"
  | "info"
  | "outline";

/* ------------------------------------------------------------------------- *
 * Pull-request state
 * ------------------------------------------------------------------------- */

export type PullRequestStatePresentation = {
  label: string;
  tone: RepositoryTone;
};

const statePresentation: Record<
  PullRequestState,
  PullRequestStatePresentation
> = {
  OPEN: { label: "Open", tone: "pass" },
  MERGED: { label: "Merged", tone: "brand" },
  CLOSED: { label: "Closed", tone: "outline" },
  UNKNOWN: { label: "Unknown", tone: "neutral" },
};

/**
 * Presentation for a pull-request state.
 *
 * `MERGED` is `brand` rather than `pass`, and `CLOSED` is `outline` rather than
 * `fail`. Both are deliberate: a closed pull request is a normal outcome, not a
 * failure, and colouring it red would make a healthy repository's history look
 * alarming. Only `OPEN` gets the positive tone, because it is the one state that
 * means "there is work here".
 */
export function pullRequestState(state: string): PullRequestStatePresentation {
  return (
    statePresentation[state as PullRequestState] ?? {
      label: humanise(state),
      tone: "neutral",
    }
  );
}

/** Label for one of the state filter tabs. */
export function pullRequestStateFilterLabel(filter: string): string {
  if (filter === "ALL") return "All";
  return pullRequestState(filter).label;
}

/* ------------------------------------------------------------------------- *
 * Repository visibility
 * ------------------------------------------------------------------------- */

export type VisibilityPresentation = {
  label: string;
  tone: RepositoryTone;
  /** Shown as a title attribute where the label alone could mislead. */
  hint?: string;
};

/**
 * Presentation for repository visibility.
 *
 * `UNKNOWN` is shown rather than hidden or assumed. It means the provider did
 * not report visibility, and silently rendering it as "Public" would be a
 * misstatement about access control — the one field on a repository where
 * guessing is not acceptable.
 */
export function repositoryVisibility(
  visibility: string,
): VisibilityPresentation {
  if (visibility === "PRIVATE") return { label: "Private", tone: "neutral" };
  if (visibility === "PUBLIC") return { label: "Public", tone: "outline" };

  return {
    label: "Visibility unknown",
    tone: "outline",
    hint: "The provider did not report whether this repository is private.",
  };
}

export function isPrivateRepository(visibility: RepositoryVisibility): boolean {
  return visibility === "PRIVATE";
}

/* ------------------------------------------------------------------------- *
 * File change type
 * ------------------------------------------------------------------------- */

export type FileChangePresentation = {
  label: string;
  tone: RepositoryTone;
  /** One letter for the compact marker beside a path in a long file list. */
  marker: string;
};

const fileChangePresentation: Record<FileChangeType, FileChangePresentation> = {
  ADDED: { label: "Added", tone: "pass", marker: "A" },
  MODIFIED: { label: "Modified", tone: "warn", marker: "M" },
  REMOVED: { label: "Removed", tone: "fail", marker: "D" },
  RENAMED: { label: "Renamed", tone: "info", marker: "R" },
  UNKNOWN: { label: "Changed", tone: "neutral", marker: "?" },
};

/**
 * Presentation for a changed file's status.
 *
 * The one-letter marker exists because a changed-files list is read by scanning
 * paths, and a full-width badge on every row would push the paths — the thing
 * being scanned — off to the right. The badge label is still available for the
 * accessible name, so the letter never carries meaning on its own.
 */
export function fileChange(status: string): FileChangePresentation {
  return (
    fileChangePresentation[status as FileChangeType] ?? {
      label: humanise(status),
      tone: "neutral",
      marker: "?",
    }
  );
}

/* ------------------------------------------------------------------------- *
 * Dates
 * ------------------------------------------------------------------------- */

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

/** `"2026-10-01T10:00:00Z"` -> `"1 Oct 2026"`. Null-tolerant. */
export function formatDate(iso: string | null | undefined): string | null {
  const date = parseInstant(iso);
  return date ? dateFormatter.format(date) : null;
}

/** `"2026-10-01T10:00:00Z"` -> `"1 Oct 2026, 10:00 UTC"`. Null-tolerant. */
export function formatDateTime(iso: string | null | undefined): string | null {
  const date = parseInstant(iso);
  return date ? dateTimeFormatter.format(date) : null;
}

/**
 * A coarse "how long ago", for the one place a list needs to be scannable.
 *
 * **Deliberately coarse — days, not minutes.** A relative time rendered on the
 * server is wrong by however long the page has been open, and a "2 minutes ago"
 * that is actually an hour old is worse than no relative time. Day-granularity
 * degrades gracefully, and the absolute date is always available as a tooltip.
 */
export function formatRelativeDay(
  iso: string | null | undefined,
): string | null {
  const date = parseInstant(iso);
  if (!date) return null;

  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);

  if (days < 0) return formatDate(iso);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "last month" : `${months} months ago`;
  }

  const years = Math.floor(days / 365);
  return years === 1 ? "last year" : `${years} years ago`;
}

function parseInstant(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* ------------------------------------------------------------------------- *
 * Failure wording
 * ------------------------------------------------------------------------- */

/**
 * Explains a failed repository or pull-request read.
 *
 * Keyed on `ScmErrorCode` from `errors.code`, never on message text. Only the
 * codes these endpoints can realistically produce are spelled out; the rest fall
 * back, because a wrong-but-specific explanation is worse than an honest vague
 * one.
 *
 * The rate-limit entry is the reason this function exists at all. A provider
 * refusing us for a few minutes is the single most likely failure on these
 * screens, and the alternative — showing "500 Internal Server Error" for
 * something that will fix itself — tells the user nothing they can act on.
 */
const failureMessages: Record<string, string> = {
  SCM_CONNECTION_NOT_FOUND:
    "That connection is no longer available. It may have been disconnected.",
  SCM_CONNECTION_NOT_ACTIVE:
    "That connection is not active, so its repositories cannot be read. Reconnect it to restore access.",
  SCM_CONNECTION_EXPIRED:
    "The stored credentials for that connection have expired. Reconnect to issue fresh ones.",
  SCM_CONNECTION_REVOKED:
    "Access was withdrawn at the provider. Reconnect to grant it again.",
  SCM_REPOSITORY_NOT_FOUND:
    "That repository could not be found through this connection. It may have been renamed or moved, or this account may no longer have access to it.",
  // Distinct from the above on purpose: nothing is wrong with a *repository*, the
  // account scope the listing reads from could not be resolved. Bitbucket removed
  // every cross-workspace API, so repositories can only be listed inside a named
  // workspace — and if this account has none, or its workspace slug differs from
  // its login, there is nothing for us to list until that is set.
  SCM_REPOSITORY_SCOPE_NOT_FOUND:
    "We could not find the workspace that holds this account's repositories. Bitbucket can only list repositories inside a workspace, so this account needs one — check that it belongs to a workspace, and that the workspace name matches the account.",
  SCM_PULL_REQUEST_NOT_FOUND:
    "That pull request could not be found in this repository.",
  SCM_PROVIDER_RESOURCE_NOT_FOUND:
    "The provider could not find what was requested.",
  SCM_OPERATION_NOT_SUPPORTED:
    "This provider does not support that operation, so there is nothing to show here.",
  SCM_OPERATION_NOT_CONFIGURED:
    "That operation is not configured for this provider on the server.",
  SCM_REQUEST_INVALID: "That request was not valid. Try adjusting the filters.",
  SCM_PROVIDER_RATE_LIMITED:
    "The provider is rate-limiting this app right now. Wait a few minutes and try again — nothing is wrong with your connection.",
  SCM_PROVIDER_API_ERROR:
    "The provider rejected the request. This is usually temporary; try again shortly.",
  SCM_RESPONSE_MAPPING_INVALID:
    "The provider's response could not be read. This is a server-side configuration problem rather than anything you did.",
  SCM_PROVIDER_INACTIVE:
    "That provider has been switched off by an administrator.",
};

export function repositoryFailureMessage(
  code: string | undefined,
  fallback?: string,
): string {
  if (code && failureMessages[code]) return failureMessages[code];
  if (fallback && fallback.trim()) return fallback;

  return "That could not be loaded. Try again, and if it keeps failing the connection may need to be re-established.";
}

/**
 * Whether a failure is one the user can resolve by reconnecting.
 *
 * Drives whether an error state offers a link back to the integrations hub
 * rather than just a retry, which would not help for any of these.
 */
export function failureSuggestsReconnect(code: string | undefined): boolean {
  return (
    code === "SCM_CONNECTION_NOT_ACTIVE" ||
    code === "SCM_CONNECTION_EXPIRED" ||
    code === "SCM_CONNECTION_REVOKED" ||
    code === "SCM_CONNECTION_NOT_FOUND"
  );
}

/* ------------------------------------------------------------------------- *
 * Connection selection
 * ------------------------------------------------------------------------- */

/**
 * Picks the connection a browsing page should read through.
 *
 * The routes are keyed by provider code because `/integrations/GITHUB/repositories`
 * is a better URL than one with a surrogate id in it, but the backend resolves
 * everything against a *connection* — and a user may well have linked two
 * accounts on the same provider. So the connection travels as an optional query
 * parameter and this resolves it:
 *
 * 1. an explicitly requested id, if it is live and belongs to this provider;
 * 2. otherwise the newest live connection for the provider.
 *
 * An explicit id that does not match is **not** silently replaced with the
 * default. Showing a different account's repositories under a URL naming one
 * account would be a quiet, convincing lie, and the two accounts may have very
 * similar repository names. The caller renders "that connection is not
 * available" instead.
 *
 * `connections` is expected in the backend's order — newest connected first —
 * which `GET /scm/connections` guarantees, so "newest" needs no re-sort.
 */
export function resolveBrowseConnection(
  connections: readonly ScmConnectionResponse[],
  providerCode: string,
  requestedId: number | undefined,
): {
  connection: ScmConnectionResponse | undefined;
  /** Every live connection for this provider, for the account switcher. */
  available: ScmConnectionResponse[];
  /** An id was asked for and could not be used. */
  requestedUnavailable: boolean;
} {
  const wanted = providerCode.trim().toUpperCase();

  const available = connections.filter(
    (connection) =>
      connection.providerCode.toUpperCase() === wanted &&
      isLiveConnection(connection),
  );

  if (requestedId !== undefined) {
    const requested = available.find(
      (connection) => connection.id === requestedId,
    );
    return {
      connection: requested,
      available,
      requestedUnavailable: requested === undefined,
    };
  }

  return {
    connection: available[0],
    available,
    requestedUnavailable: false,
  };
}

/** Label for a connection in the account switcher. */
export function connectionLabel(connection: ScmConnectionResponse): string {
  return connection.displayName ?? connection.externalAccountName;
}

/* ------------------------------------------------------------------------- *
 * Query parameter reading
 * ------------------------------------------------------------------------- */

/** `searchParams` values are `string | string[]`; a repeated param is treated as absent. */
export function singleParam(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Reads a 1-based page number from the URL.
 *
 * Out-of-range and non-numeric values fall back to page 1 rather than erroring.
 * Unlike a page *size*, a bad page number carries no risk of the caller
 * misunderstanding what it received — the response states which page it is — and
 * a hand-edited URL should not produce an error screen.
 */
export function readPageParam(
  value: string | string[] | undefined,
): number {
  const raw = singleParam(value);
  if (!raw) return 1;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

/** Reads a connection id from the URL, or `undefined` when absent or malformed. */
export function readConnectionParam(
  value: string | string[] | undefined,
): number | undefined {
  const raw = singleParam(value);
  if (!raw) return undefined;

  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
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
