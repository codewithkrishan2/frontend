/**
 * The backend's servlet context path (`server.servlet.context-path`).
 *
 * Every Spring endpoint is served beneath this prefix, so it has to be joined to each path below.
 * Controller mappings do not mention it — the container strips it before Spring routes the request —
 * which is why it lives here as one constant rather than being baked into each path string.
 *
 * It is deliberately not part of `API_ORIGIN`: that variable names an origin, and the four call sites
 * that build URLs do so by plain concatenation, so smuggling a path into it would work by accident and
 * break the moment someone switched to `new URL()`, which discards a path on the base.
 *
 * Changing `SERVER_CONTEXT_PATH` on the backend means changing this.
 */
const CONTEXT_PATH = "/coderev";

const backend = (path: string) => `${CONTEXT_PATH}${path}` as const;

/**
 * Backend paths, verbatim from the Spring controllers, prefixed with the context path.
 *
 * The application does not define `server.port`, so these are appended to the origin
 * (`http://localhost:8080` by default) to give `http://localhost:8080/coderev/api/v1/...`.
 */
export const endpoints = {
  health: backend("/api/health"),

  auth: {
    /** POST — body `{ refreshToken }`. Rotates: the presented token is revoked. */
    refresh: backend("/api/v1/auth/refresh"),
    /** POST — body `{ refreshToken }`. Idempotent; unknown tokens still 200. */
    logout: backend("/api/v1/auth/logout"),
  },

  oauth: {
    /** GET — 302 to GitHub. Must be a full-page navigation, not fetch. */
    githubAuthorize: backend("/api/v1/oauth/github/auth"),
  },

  users: {
    /** GET — requires Bearer. Responds with no `message`, only `data`. */
    me: backend("/api/v1/users/me"),
    /** PATCH — requires Bearer. Body `{ fullName? }`. */
    updateMe: backend("/api/v1/users/me"),
  },
} as const;

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
 * These must match `app.frontend-url` + path in the Spring configuration.
 * Renaming them breaks sign-in.
 */
export const oauthRoutes = {
  success: "/oauth-success",
  error: "/oauth-error",
} as const;

/**
 * Routes served by this Next.js app.
 *
 * `startGithubSignIn` is a local Route Handler that redirects to the backend's
 * authorize endpoint — the browser cannot link to the backend directly because
 * `API_ORIGIN` is server-only and there is no public rewrite.
 */
export const appRoutes = {
  login: "/login",
  dashboard: "/dashboard",
  startGithubSignIn: "/api/auth/github",
  /**
   * Clears the session, then redirects to sign-in.
   *
   * Server Components cannot write cookies, so a page that discovers its token
   * is unusable has to redirect *here* rather than straight to `/login` —
   * otherwise the cookies survive, middleware sees a session and bounces the
   * user back, looping forever.
   */
  signOut: "/api/auth/signout",
} as const;
