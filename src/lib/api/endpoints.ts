/**
 * Backend paths, verbatim from the Spring controllers.
 *
 * The application defines neither `server.port` nor
 * `server.servlet.context-path`, so these are appended directly to the origin
 * (`http://localhost:8080` by default).
 */
export const endpoints = {
  health: "/api/health",

  auth: {
    /** POST — body `{ refreshToken }`. Rotates: the presented token is revoked. */
    refresh: "/api/v1/auth/refresh",
    /** POST — body `{ refreshToken }`. Idempotent; unknown tokens still 200. */
    logout: "/api/v1/auth/logout",
  },

  oauth: {
    /** GET — 302 to GitHub. Must be a full-page navigation, not fetch. */
    githubAuthorize: "/api/v1/oauth/github/auth",
  },

  users: {
    /** GET — requires Bearer. Responds with no `message`, only `data`. */
    me: "/api/v1/users/me",
    /** PATCH — requires Bearer. Body `{ fullName? }`. */
    updateMe: "/api/v1/users/me",
  },
} as const;

/**
 * Query parameter names the backend uses when redirecting back to this app.
 *
 * `GitHubOAuthService.buildOAuthSuccessUrl` sends the browser to
 * `${app.frontend-url}/oauth-success?access_token=...&refresh_token=...`, and
 * failures to `${app.frontend-url}/oauth-error?message=...`. These are
 * snake_case, unlike every JSON field.
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
