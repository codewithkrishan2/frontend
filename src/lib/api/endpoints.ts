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
 */
export const routeGuards = {
  /** Require a session. Matched as exact path or path prefix. */
  protectedPrefixes: ["/dashboard", "/settings"],
  /** Bounce a signed-in user away from these. */
  guestOnlyPaths: [appRoutes.login],
  /** Carries the originally requested path onto the sign-in URL. */
  returnToParam: "next",
} as const;
