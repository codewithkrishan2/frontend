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
  },
} as const;

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
