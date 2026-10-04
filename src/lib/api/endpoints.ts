/**
 * Every URL this app calls or serves, in one place.
 *
 * Four kinds of string live here, and the distinction matters:
 *
 * 1. `endpoints` — paths on the Spring Boot backend. Always joined to `API_ORIGIN`
 *    server-side; never reachable from the browser.
 * 2. `oauthProviders` — the per-provider sign-in registry. Adding a provider is
 *    one entry here plus one glyph in `components/auth/oauth-sign-in.tsx`.
 * 3. `oauthRoutes` / `oauthCallbackParams` — the contract the backend redirects
 *    into. Changing either without changing Spring breaks sign-in.
 * 4. `appRoutes` / `routeGuards` — routes this Next.js app serves and protects.
 *
 * Nothing here may import from outside this module: `middleware.ts` pulls it into
 * the edge runtime, where `next/headers`, `server-only` and Node APIs are absent.
 */

/**
 * The backend's servlet context path (`server.servlet.context-path`).
 *
 * Every Spring endpoint is served beneath this prefix, so it has to be joined to each path below.
 * Controller mappings do not mention it — the container strips it before Spring routes the request —
 * which is why it lives here as one constant rather than being baked into each path string.
 *
 * It is deliberately not part of `API_ORIGIN`: that variable names an origin, and the call sites
 * that build URLs do so by plain concatenation, so smuggling a path into it would work by accident and
 * break the moment someone switched to `new URL()`, which discards a path on the base.
 *
 * Changing `SERVER_CONTEXT_PATH` on the backend means changing this.
 */
const CONTEXT_PATH = "/coderev";

const backend = (path: string) => `${CONTEXT_PATH}${path}`;

/** Base mapping shared by every OAuth controller (`@RequestMapping("/api/v1/oauth")`). */
const OAUTH_BASE = "/api/v1/oauth";

/**
 * Backend paths, verbatim from the Spring controllers, prefixed with the context path.
 *
 * The application does not define `server.port`, so these are appended to the origin
 * (`http://localhost:8080` by default) to give `http://localhost:8080/coderev/api/v1/...`.
 *
 * OAuth authorize endpoints are deliberately absent: they are per-provider and live
 * in `oauthProviders` below.
 */
export const endpoints = {
  /** GET — public. `HealthController` maps `/api/v1/health`, not `/api/health`. */
  health: backend("/api/v1/health"),

  auth: {
    /** POST — body `{ refreshToken }`. Rotates: the presented token is revoked. */
    refresh: backend("/api/v1/auth/refresh"),
    /** POST — body `{ refreshToken }`. Idempotent; unknown tokens still 200. */
    logout: backend("/api/v1/auth/logout"),
  },

  users: {
    /** GET — requires Bearer. Responds with no `message`, only `data`. */
    me: backend("/api/v1/users/me"),
    /** PATCH — requires Bearer. Body `{ fullName? }`. */
    updateMe: backend("/api/v1/users/me"),
  },

  /**
   * Source-control integration. Every path here requires a Bearer token except
   * the two the providers themselves call — the OAuth callback and the webhook
   * sink — which are `permitAll` on the backend and are not this app's concern.
   *
   * None of these paginate: the collection endpoints return a bare array in
   * `data`, ordered server-side.
   */
  scm: {
    /** GET — active providers only, ordered by `displayOrder` then name. */
    providers: backend("/api/v1/scm/providers"),
    /**
     * GET — full provider detail, keyed by the **numeric id** rather than the
     * code. `ScmProviderController` declares `@PathVariable Integer providerId`,
     * so a non-numeric segment is a 400, not a 404.
     */
    provider: (providerId: number) =>
      backend(`/api/v1/scm/providers/${providerId}`),

    /** GET — every connection for the caller, newest first. POST — create. */
    connections: backend("/api/v1/scm/connections"),
    /**
     * GET — the provider consent URL to navigate to.
     *
     * Answers JSON, not a 302, so the caller owns the navigation. `providerCode`
     * is a required `@RequestParam`; omitting it is a 400.
     *
     * Declared before `/{connectionId}` in the controller, so "authorize" is
     * never mistaken for an id.
     */
    authorize: (providerCode: string) =>
      `${backend("/api/v1/scm/connections/authorize")}?providerCode=${encodeURIComponent(providerCode)}`,
    /**
     * GET — one connection. DELETE — disconnect it.
     *
     * Ownership is enforced in the service layer, so another user's id answers
     * 404 `SCM_CONNECTION_NOT_FOUND` rather than 403. DELETE is idempotent.
     */
    connection: (connectionId: number) =>
      backend(`/api/v1/scm/connections/${connectionId}`),

    /* ------------------------------------------------------------------- *
     * Repository Management (backend Module 3)
     *
     * Everything below is nested under a connection, and that is load-bearing
     * rather than tidy. A repository has no identity in this product
     * independent of the authorization it is read through: the same name can
     * exist on two providers, and whether it is visible at all depends on whose
     * credential is asking. The backend resolves
     *
     *   authenticated user -> connection -> repository -> pull request
     *
     * and the URL states that order.
     *
     * **A repository is addressed as `{owner}/{repo}`, two path segments.**
     * Provider APIs address repositories by owner-qualified name rather than by
     * id, so the owner-qualified name *is* the identifier for these calls. The
     * `id` on a repository response is the provider's own id and is not
     * accepted in any URL — use `fullName`, or `owner` plus `name`.
     *
     * Unlike the connection and provider endpoints, **these paginate.** They
     * answer a `PageResponse` envelope inside `data`, and `totalElements` is
     * frequently absent — see `PageResponse` in `types.ts`.
     * ------------------------------------------------------------------- */

    /**
     * GET — repositories the connection's credential can see.
     *
     * `search` matches name, full name and description. It is applied by the
     * backend over provider pages, so its reach is bounded; the absence of
     * `totalElements` is how a response says the result set may be incomplete.
     */
    repositories: (connectionId: number, query?: RepositoryListQuery) =>
      withQuery(
        backend(`/api/v1/scm/connections/${connectionId}/repositories`),
        {
          page: query?.page,
          size: query?.size,
          search: query?.search,
        },
      ),

    /**
     * GET — one repository.
     *
     * A repository the credential cannot see answers 404
     * `SCM_REPOSITORY_NOT_FOUND`. Providers deliberately do not distinguish
     * "absent" from "invisible to you", and neither does this.
     */
    repository: (connectionId: number, owner: string, repo: string) =>
      backend(
        `/api/v1/scm/connections/${connectionId}/repositories/${segment(owner)}/${segment(repo)}`,
      ),

    /**
     * GET — pull requests in a repository.
     *
     * `state` is the canonical filter and is applied **by the provider**, not
     * in memory: each provider's operation configuration declares how to spell
     * it. Omitting it defaults to `OPEN` on the backend. An unrecognised value
     * is a 400 rather than a quietly defaulted list.
     */
    pullRequests: (
      connectionId: number,
      owner: string,
      repo: string,
      query?: PullRequestListQuery,
    ) =>
      withQuery(
        `${backend(
          `/api/v1/scm/connections/${connectionId}/repositories/${segment(owner)}/${segment(repo)}`,
        )}/pull-requests`,
        {
          page: query?.page,
          size: query?.size,
          state: query?.state,
          search: query?.search,
        },
      ),

    /**
     * GET — one pull request, with the repository it belongs to attached.
     *
     * Keyed by `pullRequestNumber`. On at least one provider the number and the
     * global id are different integers and only the number is accepted in a
     * URL, so passing an id here produces a 404.
     */
    pullRequest: (
      connectionId: number,
      owner: string,
      repo: string,
      pullRequestNumber: number,
    ) =>
      `${backend(
        `/api/v1/scm/connections/${connectionId}/repositories/${segment(owner)}/${segment(repo)}`,
      )}/pull-requests/${pullRequestNumber}`,

    /** GET — the files a pull request changes. Paged, because providers page it. */
    pullRequestFiles: (
      connectionId: number,
      owner: string,
      repo: string,
      pullRequestNumber: number,
      query?: PageQueryParams,
    ) =>
      withQuery(
        `${backend(
          `/api/v1/scm/connections/${connectionId}/repositories/${segment(owner)}/${segment(repo)}`,
        )}/pull-requests/${pullRequestNumber}/files`,
        { page: query?.page, size: query?.size },
      ),

    /**
     * GET — the diff, already parsed into files, hunks and lines.
     *
     * Not paged: a diff is one indivisible provider response. It is bounded
     * instead by a server-side parse budget, and `truncated` on the response
     * says when that was reached.
     */
    pullRequestDiff: (
      connectionId: number,
      owner: string,
      repo: string,
      pullRequestNumber: number,
    ) =>
      `${backend(
        `/api/v1/scm/connections/${connectionId}/repositories/${segment(owner)}/${segment(repo)}`,
      )}/pull-requests/${pullRequestNumber}/diff`,
  },
} as const;

/** Zero-based `page` and a `size` the backend caps at 100. */
export type PageQueryParams = {
  page?: number | undefined;
  size?: number | undefined;
};

export type RepositoryListQuery = PageQueryParams & {
  search?: string | undefined;
};

export type PullRequestListQuery = RepositoryListQuery & {
  /** One of `pullRequestStateFilters`. */
  state?: string | undefined;
};

/**
 * Encodes one path segment.
 *
 * Owner and repository names come from provider data rather than from user
 * input, but they still reach a URL, so they are encoded rather than trusted.
 * `encodeURIComponent` escapes `/`, which is the case that matters: a value
 * containing one must not silently become two path segments and move the
 * request to a different endpoint. The backend validates the same thing again —
 * two independent checks, because this one is easy to forget at a new call site.
 */
function segment(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Appends the query parameters that are actually set.
 *
 * Omitting rather than sending empty values matters: the backend treats an
 * absent `state` as "default to OPEN" and an absent `search` as "no filter",
 * while `?search=` would be a filter matching the empty string if it were ever
 * read literally. Building the string by hand rather than with `URLSearchParams`
 * keeps this module free of assumptions about the runtime, since `middleware.ts`
 * pulls it into the edge runtime.
 */
function withQuery(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const pairs: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    pairs.push(`${key}=${encodeURIComponent(String(value))}`);
  }

  return pairs.length === 0 ? path : `${path}?${pairs.join("&")}`;
}

/**
 * Sign-in providers the backend implements, in the order they are offered.
 *
 * `LoginProvider` on the backend also lists GITLAB and AZURE_DEVOPS, but neither
 * has a provider bean or controller, so hitting them would only produce an error
 * redirect. Only the ones with a live `/auth` endpoint belong here.
 */
export const oauthProviderIds = ["github", "bitbucket"] as const;

export type OAuthProviderId = (typeof oauthProviderIds)[number];

export type OAuthProvider = {
  id: OAuthProviderId;
  /** Human-facing name, used for button labels and UI copy. */
  label: string;
  /**
   * Backend authorize endpoint. Answers 302 to the provider's consent screen, so
   * it must be reached by a full-page navigation rather than fetch.
   */
  authorizeEndpoint: string;
  /**
   * The local Route Handler a sign-in button points at, which redirects to
   * `authorizeEndpoint`. The hop exists because `API_ORIGIN` is server-only.
   */
  startSignInRoute: string;
};

/**
 * Both URL shapes are derived from the provider id because the backend is
 * consistent about them:
 *
 *   authorize → `/api/v1/oauth/{id}/auth`  (OAuthController, BitbucketOAuthController)
 *   local      → `/api/auth/{id}`           (app/api/auth/[provider]/route.ts)
 *
 * A future provider that breaks the pattern should be spelled out explicitly
 * rather than forcing the convention.
 */
function defineProvider(id: OAuthProviderId, label: string): OAuthProvider {
  return {
    id,
    label,
    authorizeEndpoint: backend(`${OAUTH_BASE}/${id}/auth`),
    startSignInRoute: `/api/auth/${id}`,
  };
}

export const oauthProviders: Readonly<Record<OAuthProviderId, OAuthProvider>> =
  {
    github: defineProvider("github", "GitHub"),
    bitbucket: defineProvider("bitbucket", "Bitbucket"),
  };

/** Providers in display order, for iterating in the UI. */
export const oauthProviderList: readonly OAuthProvider[] = oauthProviderIds.map(
  (id) => oauthProviders[id],
);

/**
 * Narrows an untrusted path segment to a known provider.
 *
 * `/api/auth/[provider]` accepts anything, so the handler has to reject unknown
 * values rather than concatenating them into a backend URL.
 */
export function isOAuthProviderId(value: string): value is OAuthProviderId {
  return (oauthProviderIds as readonly string[]).includes(value);
}

/**
 * Query parameter names the backend uses when redirecting back to this app.
 *
 * `OAuthRedirectFactory` sends the browser to
 * `${app.frontend-url}/oauth-success?access_token=...&refresh_token=...`, and
 * failures to `${app.frontend-url}/oauth-error?message=...`. These are
 * snake_case, unlike every JSON field. The same two shapes serve every provider.
 */
export const oauthCallbackParams = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
  message: "message",
} as const;

/**
 * Frontend routes the backend redirects to.
 *
 * These must match `OAuthRedirectFactory.SUCCESS_PATH` / `ERROR_PATH` appended to
 * `app.frontend-url` in the Spring configuration. Renaming them breaks sign-in
 * for every provider at once.
 */
export const oauthRoutes = {
  success: "/oauth-success",
  error: "/oauth-error",
} as const;

/**
 * Query parameters on the SCM connection-result redirect.
 *
 * `ScmOAuthCallbackController` finishes every branch with
 * `sendRedirect("${app.frontend-url}/scm/connection-result?provider=…&status=…")`,
 * so this is a two-sided contract with `RESULT_PATH` in that controller.
 *
 * Unlike sign-in, these are camel-free single words and carry **no** token,
 * code or error detail — the controller deliberately keeps diagnostics in its
 * logs. `status` is one of exactly three literals.
 */
export const scmConnectionResultParams = {
  provider: "provider",
  status: "status",
} as const;

/**
 * Query parameters this app puts on `/integrations` when a connection attempt
 * could not even be started.
 *
 * Distinct from `scmConnectionResultParams`: those describe a provider round
 * trip that happened, these describe one that never left. `reason` carries a
 * `ScmErrorCode`, which is a safe enumerated value — the backend's diagnostic
 * messages stay in its logs.
 */
export const scmConnectStartParams = {
  outcome: "connect",
  provider: "provider",
  reason: "reason",
} as const;

/** The only value `scmConnectStartParams.outcome` takes. */
export const SCM_CONNECT_START_FAILED = "failed";

/** The three outcomes `ScmOAuthCallbackController` can redirect with. */
export const scmConnectionResultStatuses = [
  /** Credentials stored; the connection is live. */
  "success",
  /** The user declined consent at the provider (`error` param was present). */
  "denied",
  /** A `ScmException` or an unexpected failure. Detail stayed server-side. */
  "failed",
] as const;

export type ScmConnectionResultStatus =
  (typeof scmConnectionResultStatuses)[number];

export function isScmConnectionResultStatus(
  value: string | undefined,
): value is ScmConnectionResultStatus {
  return (
    value !== undefined &&
    (scmConnectionResultStatuses as readonly string[]).includes(value)
  );
}

/**
 * Routes served by this Next.js app.
 *
 * The marketing routes each render one section of the landing page as a page in
 * its own right. `/` still renders the full sequence — these are an alternative
 * way in, not a replacement — which is why the section components take a heading
 * level rather than being split into separate copies.
 */
export const appRoutes = {
  home: "/",

  product: "/product",
  features: "/features",
  howItWorks: "/how-it-works",
  pricing: "/pricing",
  developers: "/developers",

  login: "/login",
  dashboard: "/dashboard",

  /** Source-control connections hub. */
  integrations: "/integrations",
  /**
   * One provider's detail page.
   *
   * Keyed by `providerCode` rather than the numeric id the backend uses, because
   * `/integrations/GITHUB` is a URL worth having. The page resolves the code to
   * an id against the provider list before calling
   * `GET /scm/providers/{providerId}`.
   */
  integration: (providerCode: string) =>
    `/integrations/${encodeURIComponent(providerCode)}`,

  /* --------------------------------------------------------------------- *
   * Repository browsing
   *
   * Routed under the provider rather than under a connection id, so the URL a
   * user sees and shares is `/integrations/GITHUB/repositories` rather than
   * `/connections/7/repositories`. The connection is still what the backend
   * resolves against, so it rides along as the `connection` query parameter —
   * optional, because one connection per provider is the common case and the
   * pages default to the newest live one. It becomes load-bearing only when a
   * user has linked two accounts on the same provider.
   *
   * Repositories are addressed as `owner/repo`, two segments, matching the
   * backend. Build them from a repository's `fullName`, never from `name`:
   * where a provider distinguishes a display name from a URL slug, `fullName`
   * carries the slug and `name` does not.
   * --------------------------------------------------------------------- */

  /** Repository list for one provider. */
  repositories: (providerCode: string, params?: RepositoryBrowseParams) =>
    appendParams(
      `/integrations/${encodeURIComponent(providerCode)}/repositories`,
      params,
    ),

  /** One repository, with its pull requests. */
  repository: (
    providerCode: string,
    owner: string,
    repo: string,
    params?: RepositoryBrowseParams,
  ) =>
    appendParams(
      `/integrations/${encodeURIComponent(providerCode)}/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      params,
    ),

  /** One pull request: details, changed files and diff. */
  pullRequest: (
    providerCode: string,
    owner: string,
    repo: string,
    pullRequestNumber: number,
    params?: RepositoryBrowseParams,
  ) =>
    appendParams(
      `/integrations/${encodeURIComponent(providerCode)}/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pull-requests/${pullRequestNumber}`,
      params,
    ),

  /**
   * Where the backend sends the browser after a provider consent round trip.
   *
   * Must stay in step with `RESULT_PATH` in `ScmOAuthCallbackController`
   * (`/scm/connection-result`), appended to `app.frontend-url`. Renaming it
   * strands every connection attempt on a 404.
   */
  scmConnectionResult: "/scm/connection-result",
  /**
   * Starts a provider consent flow for one SCM provider.
   *
   * A local Route Handler rather than a direct link, for the same reason
   * `/api/auth/[provider]` exists: fetching the authorization URL needs the
   * access token, which lives in an httpOnly cookie and never reaches the
   * browser. The handler reads the cookie, asks the backend for the URL, then
   * redirects.
   */
  startScmConnect: (providerCode: string) =>
    `/api/scm/connect/${encodeURIComponent(providerCode)}`,
  /**
   * Clears the session, then redirects to sign-in.
   *
   * Server Components cannot write cookies, so a page that discovers its token
   * is unusable has to redirect *here* rather than straight to `/login` —
   * otherwise the cookies survive, middleware sees a session and bounces the
   * user back, looping forever.
   *
   * Note this sits alongside the dynamic `/api/auth/[provider]` segment. Next.js
   * matches static segments first, so `signout` wins; it must never be added as
   * a provider id.
   */
  signOut: "/api/auth/signout",
} as const;

/**
 * Query parameters the repository browsing pages read.
 *
 * All optional and all defaulted server-side, so a bare URL is always valid —
 * which is what makes these pages linkable and the browser's back button
 * behave. Page numbers here are **1-based**, because they are user-facing; the
 * backend's are zero-based and the service layer translates.
 */
export type RepositoryBrowseParams = {
  /** Which connection to read through. Defaults to the newest live one. */
  connection?: number | undefined;
  /** 1-based. */
  page?: number | undefined;
  search?: string | undefined;
  /** Pull-request state filter; see `pullRequestStateFilters`. */
  state?: string | undefined;
};

/** Parameter names the repository pages read, in one place so pages and links agree. */
export const repositoryBrowseParams = {
  connection: "connection",
  page: "page",
  search: "search",
  state: "state",
} as const;

/**
 * The state filters the UI offers, in the order they are shown.
 *
 * Mirrors the backend's `PullRequestStateFilter`. `ALL` is last because it is
 * the escape hatch rather than the default — the backend defaults to `OPEN`,
 * which is what a reviewer arrives to look at.
 */
export const pullRequestStateFilters = [
  "OPEN",
  "MERGED",
  "CLOSED",
  "ALL",
] as const;

export type PullRequestStateFilter = (typeof pullRequestStateFilters)[number];

export function isPullRequestStateFilter(
  value: string | undefined,
): value is PullRequestStateFilter {
  return (
    value !== undefined &&
    (pullRequestStateFilters as readonly string[]).includes(value)
  );
}

/**
 * Appends browse parameters, skipping defaults.
 *
 * `page=1` and an empty search are left off so the canonical URL for a first
 * page has no query string at all. Without that, navigating between filters
 * would accumulate noise and two URLs showing the same thing would not look
 * alike.
 */
function appendParams(
  path: string,
  params: RepositoryBrowseParams | undefined,
): string {
  if (!params) return path;

  const pairs: string[] = [];

  if (params.connection !== undefined) {
    pairs.push(`${repositoryBrowseParams.connection}=${params.connection}`);
  }
  if (params.state !== undefined) {
    pairs.push(
      `${repositoryBrowseParams.state}=${encodeURIComponent(params.state)}`,
    );
  }
  if (params.search !== undefined && params.search !== "") {
    pairs.push(
      `${repositoryBrowseParams.search}=${encodeURIComponent(params.search)}`,
    );
  }
  if (params.page !== undefined && params.page > 1) {
    pairs.push(`${repositoryBrowseParams.page}=${params.page}`);
  }

  return pairs.length === 0 ? path : `${path}?${pairs.join("&")}`;
}

/**
 * What middleware guards, and how it remembers where the user was going.
 *
 * `/settings` has no route yet; the prefix is listed so the guard is already in
 * place when it lands.
 *
 * `/scm` covers the connection-result landing page. Guarding it is deliberate
 * and safe: the backend redirect is a top-level GET navigation, which `sameSite:
 * "lax"` cookies are sent on, so the session survives the hop back from the
 * provider and the page can show the connection it just created.
 */
export const routeGuards = {
  /** Require a session. Matched as exact path or path prefix. */
  protectedPrefixes: ["/dashboard", "/integrations", "/scm", "/settings"],
  /** Bounce a signed-in user away from these. */
  guestOnlyPaths: [appRoutes.login],
  /** Carries the originally requested path onto the sign-in URL. */
  returnToParam: "next",
} as const;
