# Feature: SCM integration

Connecting source-control accounts — browsing available providers, granting consent, inspecting what was granted, and disconnecting.

This is the post-login surface at `/integrations`. It covers **connection management only** — browsing what a connection can see is the [repository management feature](repository-management.md), which this one hands off to.

Read [`../README.md`](../README.md) first for the shared rules this feature relies on, in particular that the browser never calls the backend directly.

---

## State

| Capability                                         | State     | Notes                                                                |
| -------------------------------------------------- | --------- | -------------------------------------------------------------------- |
| List available providers                           | Built     | DB-seeded on the backend: GitHub, Bitbucket                          |
| Connect a provider                                 | Built     | Full consent round trip                                              |
| Connect a second account to the same provider      | Built     | Backend upserts on `(user, provider, account)`                       |
| Reconnect an expired / revoked connection          | Built     | Same flow; renews rather than duplicates                             |
| Disconnect                                         | Built     | Confirmation dialog, destroys credentials                            |
| Connection history                                 | Built     | `DISCONNECTED` rows kept and folded away                             |
| Provider detail — scopes, capabilities, operations | Built     | `/integrations/GITHUB`                                               |
| Connection-result landing                          | Built     | Handles all three backend outcomes                                   |
| Failure explanation when connect cannot start      | Built     | Maps `ScmErrorCode` to plain English                                 |
| Browse repositories                                | Built     | Separate feature — [repository management](repository-management.md) |
| Browse pull requests, files and diffs              | Built     | Separate feature — [repository management](repository-management.md) |
| Review pull requests                               | Not built | Later module                                                         |
| Webhook status or delivery log                     | Not built | Backend ingests but exposes nothing                                  |
| Silent token refresh for connections               | Not built | Backend declares the capability, nothing schedules it                |

---

## Routes

| Route                             | Kind          | Purpose                                                       |
| --------------------------------- | ------------- | ------------------------------------------------------------- |
| `/integrations`                   | Page          | Hub — stats, live connections, provider grid, history         |
| `/integrations/[providerCode]`    | Page          | One provider: scopes, capabilities, operations, your accounts |
| `/api/scm/connect/[providerCode]` | Route Handler | 307 to the provider consent screen                            |
| `/scm/connection-result`          | Page          | **Backend redirect target** — see the contract below          |

Each route under `/integrations` has its own `loading.tsx`. The nested one exists specifically to _override_ the parent: a `loading.tsx` applies to its segment and everything below it, so without it the hub's skeleton — a stat strip and a provider grid — would stand in for a page that is actually a scope list and two capability columns, and the layout would jump when real content arrived.

---

## Connecting

Clicking Connect is **not** a Server Action. It is a plain `<a>` to a Route Handler, because three things must happen in one hop:

1. The authorize call needs the access token, which lives in an httpOnly cookie the browser's scripts cannot read.
2. That token may need refreshing first, and only Route Handlers and Server Actions may write cookies — a Server Component could obtain a rotated refresh token but not persist it.
3. The result must be a real cross-origin browser navigation to an interactive consent screen.

```
/integrations  →  <a href="/api/scm/connect/GITHUB">
               →  GET /coderev/api/v1/scm/connections/authorize?providerCode=GITHUB   (Bearer)
                  200 JSON { authorizationUrl, providerCode, state }
               →  307  authorizationUrl
               →       provider consent
               →       backend callback  (exchanges code, stores credentials, upserts)
               →  302  /scm/connection-result?provider=GITHUB&status=success
```

The backend answers the authorize call with **JSON rather than a 302** precisely so the client owns the navigation — `fetch` cannot usefully follow a cross-origin redirect to a consent page.

The provider code is **not** validated against a local allow-list. Providers are rows seeded from the backend's `resources/scm/seed/*.json`, so the backend is the only authority on which codes exist; an unknown one comes back as `SCM_PROVIDER_NOT_FOUND`. The value is URL-encoded by `endpoints.scm.authorize` before it is sent.

One guard worth keeping: `authorizationUrl` is built by our own backend from seeded configuration, so it is trusted — but it is the single value here that becomes a cross-origin navigation, so its scheme is checked rather than assumed.

```ts
if (!isHttps(authorizationUrl)) {
  return failed(request, providerCode, "SCM_PROVIDER_CONFIGURATION_INVALID");
}
```

Every provider consent endpoint is https; anything else means the seed config is wrong, and sending the user there would be an open redirect.

**Reconnecting is the same flow.** The backend upserts on `(userId, providerId, externalAccountId)`, so consenting again renews the credentials rather than creating a duplicate row. Connecting a _different_ account on the same provider adds a connection — which is why the card says "Connect another" once one is linked, so the outcome is not a surprise.

### When connect cannot start

Distinct from a round trip that came back failed. The handler redirects to the hub with enough context to explain itself:

```
/integrations?connect=failed&provider=GITHUB&reason=SCM_PROVIDER_CONFIGURATION_INVALID
```

`reason` is a `ScmErrorCode` — an enumerated, safe value. The backend's diagnostic messages stay in its logs. `scmConnectFailureMessage()` maps the codes it can realistically produce to plain English and falls back honestly for the rest, because a wrong-but-specific explanation is worse than an honest vague one. Several of those codes are server misconfiguration rather than anything the user did, so the wording says so instead of implying a retry will help.

A 401 goes to `/api/auth/signout` rather than `/login`, for the dead-cookie loop reason described in the [identity feature](identity.md#the-invalid-session-loop).

---

## Completing — the connection-result contract

The backend finishes every branch of its callback by redirecting to:

```
{FRONTEND_URL}/scm/connection-result?provider=<CODE>&status=<success|denied|failed>
```

**This path is a two-sided contract** with `ScmOAuthCallbackController.RESULT_PATH`. Renaming the route strands every connection attempt on a 404.

```ts
export const scmConnectionResultParams = {
  provider: "provider",
  status: "status",
} as const;
export const scmConnectionResultStatuses = [
  "success",
  "denied",
  "failed",
] as const;
```

| `status`  | Meaning                                | What the page offers                 |
| --------- | -------------------------------------- | ------------------------------------ |
| `success` | Credentials stored, connection live    | The new connection card, then "Done" |
| `denied`  | User declined consent at the provider  | "Try again"                          |
| `failed`  | A `ScmException` or unexpected failure | "Try again"                          |

An unrecognised or absent `status` is treated as **`failed`**. Something reached the page that the controller did not send, and the safe reading is failure — the alternative is implying a connection succeeded when nothing says it did.

The redirect **is** the completion signal. There is no polling endpoint and nothing to wait for: by the time the page renders the connection is already written, so a plain read of `GET /scm/connections` shows it. The page finds the newest live connection **matching the provider** rather than taking the head of the list, which avoids showing an unrelated account when several are linked.

If that confirmation read fails, the page says so without casting doubt on the connection — the callback had already committed before it redirected. The wording is "Connected, but the list could not be read", not an error.

The URL deliberately carries no token, code or error detail, so there is nothing sensitive to leak through the browser's history or a referrer header.

The page is reachable with a session because the hop back from the provider is a top-level GET navigation, which `sameSite: "lax"` cookies are sent on. That is why `/scm` is in `protectedPrefixes` — guarding it is safe and lets the page show the connection it just created.

---

## Disconnecting

A confirmation dialog backed by a Server Action. Confirmed rather than immediate because it destroys the stored credentials: reversing it means going through provider consent again, which is more than a misclick deserves.

The id travels in `FormData` so the control degrades to a normal submit without JavaScript. The dialog ignores backdrop clicks and Escape while the request is in flight, so the user is not left wondering whether it went through.

Open state is **derived**, not synchronised through an effect:

```ts
const open = requested && state.status !== "success";
```

"Stop asking once it is done" is a rule about current state, not a reaction to a change; an effect calling `setState` there would be a render cascade for something already knowable. The connection's status flipping to "Disconnected" in the refreshed list is the confirmation, so there is no message to leave behind.

A **404 from the backend is reported as success.** The connection is already gone, or never belonged to this user — and the backend cannot tell those apart without leaking the difference. Either way the user's intent is satisfied, so the action revalidates and reports _"That connection is already disconnected."_

The backend's DELETE is idempotent, so the control simply is not offered on an already-disconnected row.

---

## Status handling

`GET /scm/connections` returns **every** row for the user, including `DISCONNECTED` ones — the backing query has no status filter, because disconnected rows are retained for history. Two predicates in `src/lib/api/types.ts` split them:

```ts
isLiveConnection(c); // connectionStatus !== "DISCONNECTED"
isUsableConnection(c); // backend's `usable` flag
needsReconnect(c); // backend's `reauthorizationRequired`, or readiness ERROR
```

The hub renders live connections first and folds disconnected ones into a `<details>` — they are a record, not something to act on.

### Readiness, not status

`ScmConnectionResponse` carries `readiness`, `usable` and `reauthorizationRequired` alongside `connectionStatus`, and **the derived fields are the ones to branch on.**

The raw status cannot answer "can I use this now". `EXPIRED` means two different things: usable, when the backend can renew the credential silently from a stored refresh token, and not usable when it cannot. This UI used to read the status directly and list every `EXPIRED` connection as needing a reconnect — which was wrong in the common case, because the backend renews those on demand and on a background sweep. A user with a perfectly working Bitbucket account was shown a warning badge and a Reconnect button for a token the backend had already replaced.

So `needsReconnect` no longer includes `EXPIRED`; it reads `reauthorizationRequired`. Both predicates fall back to `connectionStatus` when the field is absent, so an older backend still renders sensibly.

| `readiness` | Label | Tone | Reconnect offered |
| ----------------------------- | ---------------- | ------- | ----------------- |
| `READY` | Active | pass | no |
| `EXPIRING` | Renewing soon | pass | no |
| `REFRESHABLE` | Renewing | pass | no |
| `REAUTHORIZATION_REQUIRED` | Reconnect needed | fail | yes |
| `ERROR` | Error | fail | yes |
| `DISCONNECTED` | Disconnected | outline | yes |

`EXPIRING` and `REFRESHABLE` are deliberately `pass` with no action: the user has nothing to do, and a warning tone would train them to ignore the badge. `scmConnectionState(connection)` in `src/lib/scm/presentation.ts` picks this map when `readiness` is present and falls back to the status map otherwise — the status map is retained for that fallback and for `scmStatus` callers that only hold a string.

Only states with a consequence get a written explanation; narrating "Active" would be noise on the common case.

`src/lib/scm/presentation.ts` holds all of that wording, plus capability and operation labels and plain-English glosses for OAuth scopes. **Every lookup falls back** rather than throwing — a provider code, capability or scope string can appear without a frontend release, and an unknown value should degrade to a humanised label (`SCREAMING_SNAKE` → "Screaming snake") instead of blanking the page.

Dates are formatted with a pinned `en-GB` locale and `timeZone: "UTC"`, because these render in Server Components and a locale- or timezone-dependent format would differ between server and browser and trip hydration. `tokenExpiryState` additionally classifies an expiry as `none | valid | expiring | expired`, where `none` means the token does not expire — a normal state for some providers rather than something to flag.

---

## Pages

### Hub — `/integrations`

Two backend reads issued together with `Promise.all`, because neither depends on the other: `GET /scm/providers` for what can be connected, `GET /scm/connections` for what already is.

Sections, in order: the connect-failure banner when present, a three-up stat strip (linked accounts, providers available, needs attention), connected accounts or an empty state, the available-provider grid, and the folded history.

The "Needs attention" stat colours a non-zero count as _bad_ — `positiveIsGood: false` — because more connections needing attention is not an improvement.

### Provider detail — `/integrations/[providerCode]`

Routed by `providerCode` because `/integrations/GITHUB` is a better URL than a surrogate id, but `GET /scm/providers/{providerId}` is keyed by the numeric id — so the code is resolved first, against the provider list and then, as a fallback, against the user's own connections. The list returns active providers only while the detail endpoint resolves regardless of the `active` flag; without that fallback, a provider switched off after someone connected to it would 404 here even though their connection still appears on the hub.

Scopes come first on the page. It is the one section with a consequence for the user's own account, so it should not sit below the feature matrix. The raw scope is always shown alongside its gloss, since the provider is the authority on what it permits.

Supported and unsupported capabilities are reported separately because the backend reports them separately: a capability can be declared supported while its operation row is absent, which is why "Configured operations" is its own section.

The two capability cards use `items-start`, because the lists are usually very uneven — one excluded capability against eleven supported ones — and the grid's default `stretch` would pad the short card out to match, leaving a tall empty panel.

```tsx
// resolution and notFound() sit outside every try block on purpose
const providerId = findProviderByCode(providers, providerCode)?.id ?? …;
if (providerId === undefined) notFound();
```

`notFound()` and `redirect()` work by throwing a sentinel the framework catches. Calling either inside a `try` means our own `catch` sees it first and the status is lost on the way back out — the page renders the 404 body but answers 200. Keeping the call outside any `try` lets the signal reach Next.js untouched. Failures are funnelled through a `handleLoadError` helper that is only ever called _from_ a `catch`.

---

## Backend contract

| Method | Path                                              | Auth   | Used by                                 |
| ------ | ------------------------------------------------- | ------ | --------------------------------------- |
| GET    | `/api/v1/scm/providers`                           | Bearer | hub, provider detail                    |
| GET    | `/api/v1/scm/providers/{providerId}`              | Bearer | provider detail                         |
| GET    | `/api/v1/scm/connections`                         | Bearer | hub, provider detail, connection-result |
| GET    | `/api/v1/scm/connections/authorize?providerCode=` | Bearer | connect Route Handler                   |
| DELETE | `/api/v1/scm/connections/{connectionId}`          | Bearer | disconnect action                       |
| GET    | `/api/v1/scm/connections/{connectionId}`          | Bearer | wrapper exists, unused                  |
| POST   | `/api/v1/scm/connections`                         | Bearer | wrapper exists, unused                  |

**None of _these_ endpoints paginate.** Both collection endpoints return a bare array in `data`, ordered server-side — providers by `displayOrder` then name, connections newest-connected first. There is no `page` or `size` to pass. The repository-management endpoints nested beneath `/scm/connections/{connectionId}` do paginate, with a `PageResponse` envelope; see [that feature](repository-management.md#pagination).

`providerId` and `connectionId` are `Integer` on the backend, so a non-numeric segment is a 400, not a 404. Ownership is enforced in the backend's service layer, so another user's connection id answers `404 SCM_CONNECTION_NOT_FOUND` rather than 403.

`POST /scm/connections` is the _frontend-captured-code_ path and performs no `state` verification, because identity comes from the verified bearer token instead. It is unused: the configured provider redirect URIs point at the backend's own callback. The wrapper exists so the contract is complete if a provider is ever registered against a frontend redirect URI.

Types in `src/lib/api/types.ts`: `ScmProviderResponse`, `ScmProviderDetailResponse`, `ScmConnectionResponse`, `ScmAuthorizationUrlResponse`, `CreateScmConnectionRequest`, plus the enums `ScmProviderType`, `ScmConnectionStatus`, `ScmCapabilityCode`, `ScmOperationCode` and `ScmErrorCode`.

`providerCode` is deliberately typed as a plain **string**, not a union — providers are database rows, so a new one is an insert rather than a code change. `ScmConnectionResponse` never carries a token or token reference; the backend's mapper has no access to the credential store.

---

## Files

```
src/
├── app/
│   ├── (app)/integrations/
│   │   ├── page.tsx                      hub
│   │   ├── loading.tsx
│   │   └── [providerCode]/
│   │       ├── page.tsx                  provider detail
│   │       └── loading.tsx               overrides the parent fallback
│   ├── (app)/scm/connection-result/page.tsx
│   └── api/scm/connect/[providerCode]/route.ts
├── components/scm/
│   ├── provider-tile.tsx                 logo in a per-provider tinted tile
│   ├── provider-connect-card.tsx         one provider, offered for connection
│   ├── connect-provider-button.tsx       anchor to the connect Route Handler
│   ├── connection-card.tsx               one linked account
│   ├── connection-status-badge.tsx       status + dot
│   └── disconnect-connection.tsx         "use client" — confirmation dialog
└── lib/scm/
    ├── service.ts                        server-only wrappers over the endpoints
    ├── actions.ts                        "use server" — disconnect only
    └── presentation.ts                   wording, dates, failure messages
```

Only disconnect is a Server Action. Connecting cannot be one: it has to end in a cross-origin navigation, and an action can only redirect within this app.

`ProviderTile` applies a per-provider gradient, because the GitHub and Bitbucket marks are both monochrome and read as similar at small sizes. `ConnectionStatusBadge` carries a status dot — `pass` and `warn` differ only in hue, and a badge relying on colour alone fails for anyone who cannot distinguish them; the label carries the meaning and the dot makes the row scannable.

Provider artwork lives in `src/components/brand/provider-mark.tsx`, shared with sign-in. An unknown provider code falls back to a generic stroked mark rather than an empty square.

---

## Tests

**None committed.** The screens were verified during development against the live backend across all three Playwright viewports — hub, provider detail, all four connection-result states, the connect hand-off returning a 307 to the real consent URL, unknown-provider failure, and sidebar navigation — but that scaffolding was removed rather than committed.

Worth adding, in rough priority order: the connection-result contract for all three `status` values plus an absent one; the connect Route Handler's 307 target and its failure redirect; hub rendering with and without connections; and the disconnect confirmation path.

---

## Known gaps

- **No committed tests** for any of this feature's routes.
- **A misconfigured provider cannot be detected ahead of time.** `GET /scm/providers` exposes no signal for whether server-side credentials are configured — `active` only reflects the database flag — so Connect cannot be disabled preemptively. It fails on click with an explanatory banner instead.
- **No webhook visibility.** The backend ingests, normalises and dispatches deliveries; nothing is surfaced here, and nothing subscribes on the backend either.
- **No way to set a Bitbucket workspace.** Bitbucket's repository listing needs a workspace slug, and Atlassian removed every endpoint that could discover one, so the backend falls back to the account name. When they differ — or when the account belongs to no workspace — listing fails with `SCM_REPOSITORY_SCOPE_NOT_FOUND` and the only fix today is setting `metadata.workspace` on the connection row directly. There is no UI for it.
- **Renewal is invisible while it happens.** `REFRESHABLE` renders as "Renewing", but there is no polling or revalidation, so the badge updates on the next navigation rather than when the renewal lands.
- Bitbucket declares `CREATE_PR_REVIEW` unsupported, so its detail page shows "Submit reviews" under Not supported even once connected. That is a backend capability declaration, not a UI bug.
- The hub does not summarise connections on `/dashboard`; that would mean a second backend round trip on a page that otherwise needs one, so the dashboard links here instead.
