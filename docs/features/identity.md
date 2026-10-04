# Feature: Identity

OAuth sign-in, session lifetime, and the signed-in user's own profile.

Sign-in is **OAuth-only** — there is no password anywhere in the product, on either side. Two providers work: GitHub and Bitbucket.

Read [`../README.md`](../README.md) first for the shared rules this feature relies on, in particular that the browser never calls the backend directly.

---

## State

| Capability                                   | State     | Notes                                                          |
| -------------------------------------------- | --------- | -------------------------------------------------------------- |
| Sign in with GitHub                          | Built     | Scopes `read:user user:email`                                  |
| Sign in with Bitbucket                       | Built     | Scopes come from the consumer registration                     |
| Session cookies                              | Built     | Three httpOnly cookies, 30 days                                |
| Proactive token refresh                      | Built     | Runs in middleware, before a protected page renders            |
| Route guarding + guest-only bounce           | Built     | Prefix-based                                                   |
| Sign out                                     | Built     | Revokes server-side, then clears cookies                       |
| Dead-session recovery                        | Built     | Via `/api/auth/signout`, not `/login`                          |
| View own profile                             | Built     | `/dashboard`                                                   |
| Edit own profile                             | Built     | `fullName` is the only editable field                          |
| Sign in with GitLab / Azure DevOps           | Not built | Backend enum has the values, no provider implementation        |
| Password login, registration, password reset | Not built | No password column exists                                      |
| Email verification flow                      | Not built | Flag is copied from the provider at sign-in                    |
| Roles / permissions                          | Not built | Backend issues zero authorities                                |
| Account deletion or deactivation             | Not built | No endpoint; requires a manual DB update                       |
| Session / device management                  | Not built | See [Known gaps](#known-gaps) — one refresh token per provider |

---

## Routes

| Route                  | Kind          | Purpose                                                                         |
| ---------------------- | ------------- | ------------------------------------------------------------------------------- |
| `/login`               | Page          | Public but **guest-only** — middleware bounces a signed-in user to `/dashboard` |
| `/api/auth/[provider]` | Route Handler | 307 to the backend authorize endpoint                                           |
| `/oauth-success`       | Route Handler | Turns query tokens into cookies, 302 to `/dashboard`                            |
| `/oauth-error`         | Page          | Renders the backend's `message` param as text                                   |
| `/api/auth/signout`    | Route Handler | Best-effort revoke, clear cookies, 303 to `/login`                              |
| `/dashboard`           | Page          | Authenticated. Profile summary and edit form                                    |

`/oauth-success` and `/oauth-error` are **excluded from the middleware matcher**. Running the guard before the session exists would redirect the user to sign-in in the middle of signing in.

---

## Signing in

The chain is redirect-only, end to end.

```
/login  →  <a href="/api/auth/github">
        →  307  {API_ORIGIN}/coderev/api/v1/oauth/github/auth
        →  302  provider consent screen
        →       backend callback
        →  302  {SITE}/oauth-success?access_token=…&refresh_token=…
        →       cookies written
        →  302  /dashboard
```

`/login` renders plain `<a>` anchors — never `next/link`, never `fetch`. A full-page navigation is required because the consent screen is an interactive page on another origin: fetch would follow the redirects and hand back the consent page's HTML instead of showing it, and client-side routing cannot leave the origin at all. `rel="nofollow"` keeps crawlers out of a flow that mutates state.

The provider buttons render from the registry in `endpoints.ts`, so adding a provider is one entry there plus one glyph — not new markup:

```ts
export const oauthProviderIds = ["github", "bitbucket"] as const;
```

The backend's `LoginProvider` enum also lists GitLab and Azure DevOps, but neither has a provider bean or controller route, so hitting them would only produce an error redirect. Only providers with a live `/auth` endpoint belong in that registry.

`/api/auth/[provider]` validates the segment with `isOAuthProviderId` before concatenating it into a backend URL — without that check an arbitrary value would be interpolated. An unknown provider is a 404, not a proxy attempt. The handler is dynamic so adding a provider needs no new file; `/api/auth/signout` is a static sibling and Next.js matches static segments first, so it is unaffected and must never be added as a provider id.

`oauth-success` is a **Route Handler, not a page**, because only handlers and Server Actions may write cookies.

**The post-sign-in destination is always `/dashboard`.** The `next` param is captured on the login URL but not honoured, because the backend generates its own OAuth `state` and never round-trips the one it receives — there is nowhere to carry the intended destination.

---

## Where tokens live

Three httpOnly cookies, `sameSite: "lax"`, path `/`, 30-day max-age:

| Cookie        | Contents                      |
| ------------- | ----------------------------- |
| `coderev_at`  | Access token                  |
| `coderev_rt`  | Refresh token                 |
| `coderev_exp` | Access-token expiry, epoch ms |

`sameSite: "lax"` is required, not incidental: the session is established by a cross-site redirect from the provider, and `strict` would withhold the cookies on that navigation.

The access-token cookie deliberately outlives the token itself, so middleware can distinguish "expired" from "no session".

Nothing is in `localStorage`. `identity.spec.ts` asserts the tokens never become readable by page scripts.

```ts
// src/lib/auth/cookies.ts
export const cookieNames = {
  accessToken: "coderev_at",
  refreshToken: "coderev_rt",
  accessTokenExpiry: "coderev_exp",
} as const;

export const ACCESS_TOKEN_SKEW_SECONDS = 60;
```

`isExpired` applies that 60-second skew, so a token about to expire is refreshed rather than used and rejected mid-request.

---

## Refresh, and why it lives in middleware

`middleware.ts` guarantees a fresh access token before a protected page renders.

Next.js only allows cookie writes in middleware, Route Handlers and Server Actions. A Server Component that refreshed during render could obtain new tokens but not persist them — and because the backend **rotates and revokes** on every refresh, discarding the new refresh token would log the user out on their next request.

The middleware cannot import `@/lib/api/server` or `@/lib/auth/session`: both are `server-only` and rely on `next/headers`, neither available in the edge runtime. Hence a direct `fetch` in that file.

On a successful refresh the new token is set on **both** the response cookies and the request cookies:

```ts
const response = NextResponse.next({ request });

for (const cookie of buildSessionCookies(auth)) {
  request.cookies.set(cookie.name, cookie.value);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
}
```

Setting it on the request is what lets the Server Component rendering in that same request see the new token rather than the stale one.

Two constraints follow from backend behaviour:

- The backend revokes the presented refresh token before issuing its replacement, and stores one token per `(user, provider)`. **Two concurrent refreshes race and the loser gets 401.** Callers must persist immediately and must not refresh in parallel.
- A rejected refresh token is terminal — revoked, rotated by a concurrent request, or expired. The session is dropped rather than retried, and the dead cookies are cleared on the way to `/login`.

If the backend is unreachable, `refreshTokens` returns null and the user is treated as "cannot establish a session right now" rather than being shown a 500 mid-navigation.

---

## The invalid-session loop

A Server Component that discovers its token is unusable must redirect to `/api/auth/signout`, **not** `/login`.

Going straight to `/login` would leave the dead cookies in place; middleware would see "a session exists", bounce the user to `/dashboard`, fail again, and loop forever. The sign-out handler clears the cookies first.

Every authenticated page follows this on `ApiError.isUnauthorized`:

```ts
if (error.isUnauthorized) {
  redirect(appRoutes.signOut);
}
```

`identity.spec.ts` covers this explicitly ("an invalid session is cleared instead of looping").

The normal, user-initiated path is `logoutAction`, which revokes the refresh token server-side _and_ clears cookies. The cookie clear happens unconditionally, even if the backend call fails: the backend does not denylist access tokens, so the current one stays technically valid for up to 15 minutes, and dropping the cookie is what actually ends the session from this app's point of view.

---

## Helpers

`src/lib/auth/session.ts` — all `server-only`:

| Helper                                      | Callable from                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `getSession()`                              | anywhere server-side, including Server Components. Null when `coderev_rt` is absent |
| `needsRefresh(session)`                     | anywhere                                                                            |
| `fetchCurrentUser(token)`                   | Server Components — read-only, does not refresh                                     |
| `updateCurrentUser(token, req)`             | Actions                                                                             |
| `getFreshAccessToken()`                     | **Server Action / Route Handler only** — may write cookies                          |
| `persistSession` / `clearSession`           | **Server Action / Route Handler only**                                              |
| `requestTokenRefresh`, `revokeRefreshToken` | Actions / Handlers                                                                  |

There is **no `requireAuth()`**. The established pattern in a protected Server Component is:

```ts
const session = await getSession();
if (!session) redirect(appRoutes.login);
```

`getSession` treats the refresh token as what makes a session recoverable — without it there is nothing to continue, even if an access token happens to still be present.

`src/lib/auth/current-user.ts` wraps `fetchCurrentUser` in React's `cache()`, keyed on the token. The `(app)` layout needs the profile for the sidebar and a page inside it may need the same profile; both run in one render, and `cache: "no-store"` means Next.js will not dedupe them on its own. Keying on the token is what makes it safe — a different user's request carries a different token. Rejections are memoised too, so both callers see the same `ApiError` and can each decide what to do.

Mutations go through `"use server"` actions in `src/lib/auth/actions.ts` returning a shared `ActionState` union. `action-state.ts` is a separate file on purpose: a `"use server"` file may only export async functions, so exporting the `idleState` constant from `actions.ts` fails the build with _"A \"use server\" file can only export async functions, found object."_

---

## Profile

`/dashboard` is the authenticated landing page and exercises the identity endpoints end to end: `GET /users/me` on render, `PATCH /users/me` through `ProfileForm`, `POST /auth/logout` through the shell's sign-out button.

The access token is read straight from the session — middleware has already refreshed it if it was stale, because a Server Component cannot write the rotated token back to cookies.

`ProfileForm` is the house pattern for a mutation: `"use client"`, `useActionState`, a `Field` render-prop wiring label and error, and per-field errors from the backend's validation map.

Two backend quirks the form compensates for:

- `UpdateProfileRequest.fullName` has `@Size(max = 100)` but **no `@NotBlank`**, so an empty string is accepted and would wipe the stored name. `updateProfileAction` refuses it rather than silently clearing: _"Name cannot be empty."_
- The 100-character limit is mirrored client-side so an obviously invalid value skips the round trip. The backend still enforces it.

After a successful update the action calls `revalidatePath(appRoutes.dashboard)`, because the dashboard is a Server Component reading the profile and must re-render for the new name to appear.

The card deliberately has **no "Sign-in method" row**. With both GitHub and Bitbucket in play it would be a guess: `UserResponse` carries no provider field, and the `UserLogin` row that knows the answer is not exposed. Showing anything there would be invention.

Dates use a pinned `en-GB` locale and `timeZone: "UTC"`. `createdAt` is an ISO instant whose fractional-second precision is not fixed, so it is parsed rather than pattern-matched, and a locale-dependent format would differ between server and browser and trip hydration.

---

## Backend contract

| Method | Path                                     | Auth   | Used by                                |
| ------ | ---------------------------------------- | ------ | -------------------------------------- |
| GET    | `/api/v1/oauth/{github\|bitbucket}/auth` | public | `/api/auth/[provider]`                 |
| GET    | `/api/v1/oauth/{provider}/callback`      | public | the provider — not this app            |
| POST   | `/api/v1/auth/refresh`                   | public | `middleware.ts`, `getFreshAccessToken` |
| POST   | `/api/v1/auth/logout`                    | public | `logoutAction`, `/api/auth/signout`    |
| GET    | `/api/v1/users/me`                       | Bearer | `/dashboard`, `(app)` layout           |
| PATCH  | `/api/v1/users/me`                       | Bearer | `updateProfileAction`                  |

Redirect contracts owned by the backend — changing either side breaks sign-in for every provider at once:

```ts
export const oauthRoutes = {
  success: "/oauth-success",
  error: "/oauth-error",
} as const;

export const oauthCallbackParams = {
  accessToken: "access_token", // snake_case, unlike every JSON field
  refreshToken: "refresh_token",
  message: "message",
} as const;
```

`AuthResponse` carries `tokenType` and `expiresIn`, but the backend's success redirect passes only the two tokens — so `oauth-success` writes cookies with an **assumed** 900-second access-token lifetime.

Types live in `src/lib/api/types.ts`: `UserResponse`, `AuthResponse`, `RefreshTokenRequest`, `LogoutRequest`, `UpdateProfileRequest`, `UserStatus`, and `MAX_FULL_NAME_LENGTH`.

---

## Files

```
src/
├── middleware.ts                      route guard + proactive refresh
├── app/
│   ├── login/page.tsx                 self-contained shell, CodeField backdrop
│   ├── oauth-success/route.ts         query tokens → cookies → /dashboard
│   ├── oauth-error/page.tsx
│   ├── api/auth/[provider]/route.ts   307 → backend authorize
│   ├── api/auth/signout/route.ts      revoke + clear + 303 → /login
│   └── (app)/dashboard/page.tsx       profile summary and edit form
├── components/auth/
│   ├── oauth-sign-in.tsx              provider anchors, rendered from the registry
│   ├── profile-form.tsx               "use client" + useActionState
│   └── logout-button.tsx              "use client" + useTransition
└── lib/
    ├── api/{endpoints,server,types,errors}.ts
    └── auth/
        ├── cookies.ts                 cookie contract, buildSessionCookies, isExpired
        ├── session.ts                 getSession, getFreshAccessToken, endpoint wrappers
        ├── current-user.ts            cache()-deduped profile loader
        ├── actions.ts                 "use server" — updateProfileAction, logoutAction
        └── action-state.ts            ActionState union + idleState
```

Provider artwork is in `src/components/brand/provider-mark.tsx`, shared with the SCM feature. Sign-in keys off lowercase OAuth provider ids and SCM cards off uppercase `providerCode`, so lookups are normalised and either spelling resolves to the same mark.

---

## Tests

`tests/identity.spec.ts` — unauthenticated guard behaviour, `/login` rendering, both OAuth redirect hops, unknown-provider rejection, the sign-out handler not being shadowed by the dynamic route, `oauth-success` cookie conversion, tokens not being readable by page scripts, `oauth-error`, the invalid-session loop, and expired-token refresh.

`tests/authenticated.spec.ts` — mints a real JWT and installs the three cookies, then asserts the dashboard renders real Postgres data, `PATCH` persists (verified by a direct backend call), an empty name is refused, sign-out clears cookies and re-protects the route, and an expired token ends the session. Skips cleanly if the seeded user is absent.

`scripts/mint-test-token.mjs` signs **HS512 with `iss: "coderev-identity"`**. `JwtTokenProvider` pins the algorithm and calls `requireIssuer`, and a mismatch is rejected as a bad signature — which is indistinguishable from a missing user, since both surface as the same 401. Getting either wrong makes the whole authenticated suite skip silently.

---

## Known gaps

- **One refresh token per `(user, provider)` on the backend.** Signing in on a second device silently rotates the first device's token away; when that device refreshes, the backend's reuse detection revokes _every_ session for the user. There is no per-device session table and nothing in the UI surfaces this.
- **Concurrent refresh is unprotected server-side** (last write wins). Middleware refreshes once per request, but parallel navigations can still race.
- **Logout does not invalidate the current access token** — the backend has no `jti` or denylist, so it stays valid for up to 15 minutes. Clearing the cookie is what ends the session here.
- `next` is captured on the login URL but never honoured; sign-in always lands on `/dashboard`.
- `oauth-success` assumes a 900-second access-token lifetime because the backend's redirect omits `expiresIn`.
- No account deletion, deactivation or "sign out everywhere" UI.
- `/settings` is guarded but has no route.
- The dashboard cannot show which provider the user signed in with, because the backend does not expose it.
