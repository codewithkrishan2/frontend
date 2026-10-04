# Feature: Repository management

Browsing what a connected SCM account can see — repositories, their pull requests, the files a pull request changes, and the diff.

This is the surface beneath `/integrations/[providerCode]/repositories`. It is the first feature that **uses** a connection rather than managing one, and it is the foundation the future Review Orchestration and AI Review modules read from.

Read [`../README.md`](../README.md) first for the shared rules this feature relies on, in particular that the browser never calls the backend directly. Read [`scm-integration.md`](scm-integration.md) for how a connection comes to exist in the first place.

---

## State

| Capability                                   | State     | Notes                                                                                        |
| -------------------------------------------- | --------- | -------------------------------------------------------------------------------------------- |
| Browse repositories through a connection     | Built     | Paged, newest-updated first                                                                  |
| Search repositories                          | Built     | Backend-side over a bounded scan — see [Search](#search)                                     |
| Switch between accounts on the same provider | Built     | Hidden when only one is linked                                                               |
| Repository detail                            | Built     | Owner, visibility, default branch, provider URL                                              |
| Pull-request list                            | Built     | Open / Merged / Closed / All, filtered at the provider                                       |
| Search pull requests                         | Built     | Title, author, branches, exact `#number`                                                     |
| Pull-request detail                          | Built     | State, branches, author, timestamps, description                                             |
| Changed files                                | Built     | Paged, with per-file add/delete counts                                                       |
| Diff viewer                                  | Built     | Files, hunks, both sets of line numbers                                                      |
| Bitbucket parity                             | Built     | Same screens, same code — see [Provider parity](#provider-parity)                            |
| Cross-repository pull-request inbox          | Not built | No backend endpoint; PRs exist only inside a repository                                      |
| Markdown rendering of PR descriptions        | Not built | Deliberate — see [Pull-request detail](#pull-request-detail--pull-requestspullrequestnumber) |
| Review, comments, AI analysis                | Not built | Later modules                                                                                |
| Caching of repository or PR data             | Not built | Deliberate — every read hits the provider                                                    |

---

## The flow

```
/integrations                           connections hub (SCM integration feature)
     │  "Browse repositories" on a live connection
     │
     │            /repositories                 sidebar entry — picks an account,
     │                 │                        or redirects straight through
     ├─────────────────┘
     ▼
/integrations/GITHUB/repositories?connection=7
     │  click a repository
     ▼
/integrations/GITHUB/repositories/acme/api?connection=7
     │  click a pull request
     ▼
…/acme/api/pull-requests/123?connection=7     details + changed files + diff
```

---

## Routes

| Route                                                      | Kind | Purpose                                   |
| ---------------------------------------------------------- | ---- | ----------------------------------------- |
| `/repositories`                                            | Page | Account chooser — "select SCM connection" |
| `/integrations/[providerCode]/repositories`                | Page | Repository list, search, paging           |
| `/integrations/[providerCode]/repositories/[owner]/[repo]` | Page | Repository detail + pull-request list     |
| `…/[owner]/[repo]/pull-requests/[pullRequestNumber]`       | Page | PR detail + changed files + diff          |

Each has its own `loading.tsx`. The nested ones exist to _override_ the one above: a `loading.tsx` applies to its segment and everything beneath it, so without them the provider-detail skeleton (a scope list and two capability columns) would stand in for a list of repository cards, and the repository-list skeleton would stand in for a diff. The shapes differ enough that the layout would jump when real content arrived.

### `/repositories` — the account chooser

The feature has **two entry points**, and they answer the same question differently.

From the integrations hub, a connection card's "Browse repositories" already knows which account you mean, so it links straight into that account's list.

From the sidebar, nothing is known yet — so `/repositories` resolves it:

- **one usable connection → redirect straight through.** A one-item picker is a dead click.
- **several → a short list of accounts**, which is the only place the choice is genuinely the user's.
- **none → an empty state** pointing at connecting one.

`EXPIRED` and `REVOKED` connections are excluded from the list and named in a banner beneath it. Offering them would fail on the first provider call; omitting them silently would leave a user with two accounts wondering where the second went.

It is **top-level rather than nested under `/integrations`** because the sidebar needs a destination the user is not already on. Before it existed, the Repositories row pointed at `/integrations` — so clicking it from the hub, which is the page it is reached from, **did nothing at all**.

It deliberately does **not** aggregate repositories across connections. That would mean a provider call per connection on every load, and paging a merged list whose sources page independently and publish no totals is not a solved problem. The page exists to get out of the way, not to be a screen.

**No Route Handlers and no Server Actions.** This feature is entirely reads, so there is nothing to write and nothing that needs a cross-origin navigation. Every page is a Server Component.

### Why the routes are nested under the provider, but keyed by connection

The URL says `/integrations/GITHUB/repositories` because `/connections/7/repositories` is a worse URL to see and share. But the backend resolves everything against a **connection**, not a provider — a user can link two GitHub accounts, and which repositories exist depends on whose credential is asking.

So the connection travels as an optional `?connection=` parameter:

```ts
resolveBrowseConnection(connections, providerCode, requestedId);
// 1. the requested id, if it is live and belongs to this provider
// 2. otherwise the newest live connection for the provider
```

An explicitly requested id that cannot be used is **reported, not silently replaced**. Falling back to the default would show one account's repositories under a URL naming another — a quiet, convincing lie, and two accounts on the same provider frequently have similarly named repositories.

### Why a repository is two path segments

`[owner]/[repo]`, not `[repositoryId]`.

Provider APIs address repositories by owner-qualified name, and neither provider's configuration exposes an id-keyed route. The owner-qualified name **is** the repository's identifier for every call this feature makes. The `id` on a repository response is the provider's own id, useful for correlation and stable across renames, but no backend route accepts it.

Two segments rather than one URL-encoded segment because an encoded slash (`%2F`) is not reliably passed through by servlet containers and reverse proxies — Tomcat rejects it by default — and a route that depends on that is a route that breaks on deployment rather than in development.

**Build links from `fullName`, never from `name`.** Where a provider distinguishes a display name from a URL slug, `fullName` carries the slug. `splitRepositoryFullName` splits it on the **last** separator, matching the backend's `RepositoryRef.parse`, and returns `null` for a value that is not owner-qualified so a card renders unlinked rather than linking somewhere wrong.

---

## Everything is a link or a GET form

There is **no client JavaScript in this feature**. Not one `"use client"` file. Search, paging, state filtering and account switching are all plain navigations:

- **Search** is a `<form method="get">`. Submitting navigates to the same page with a new query string.
- **Paging** is two links, `rel="prev"` and `rel="next"`.
- **State filters** are four links with `aria-current="page"`.
- **Account switching** is one link per account.
- **Per-file diff collapsing** is `<details>`, which the platform already provides.

That is not minimalism for its own sake. It means every view is a real URL that can be shared and reached with the back button, the whole feature works before hydration and on a failed bundle load, and — for search specifically — one request happens per search the user actually meant, rather than one per keystroke against an endpoint that costs several provider API calls.

The cost is that search results appear on submit rather than as you type. For this backend cost, that is the better trade.

`page` is deliberately **not** preserved across a search or a filter change. A new query invalidates the old position, and keeping page 4 would show an empty page that reads as "no results".

---

## Pagination

**The one thing to get right here: drive page controls from `hasNext`, never from `totalPages`.**

```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "first": true,
  "last": false,
  "hasNext": true
}
```

Note what is absent. `totalElements` and `totalPages` are **usually missing**, and that is the contract rather than a gap: neither GitHub's repository listing nor Bitbucket's pull-request listing publishes a total — both say only "there is another page". The backend's options were to omit the total or invent one, and an invented total is worse because a client cannot tell it is wrong; it would render "1–20 of 20" over a list with three more pages.

`last` is always the negation of `hasNext`, so it stays accurate with no total to derive it from.

This is why `PageNav` exists instead of the `Pagination` primitive from `components/ui`. That component takes a `pageCount` and renders numbered buttons, which requires knowing how many pages there are. It is the right component for a list with a real total; this is not one.

UI page numbers are **1-based** because they are user-facing. The backend's are zero-based. The translation is a single subtraction at each call site:

```ts
page: page - 1,
```

---

## Search

Neither configured provider offers a server-side search on the listings this feature reads. GitHub's `/user/repos` has no query parameter for it; neither the pull-request listing nor the diffstat listing has one either. So the filter is applied **by the backend**, over provider pages it fetches in sequence, bounded by configuration:

```yaml
repository:
  search:
    max-pages: 5 # up to 5 provider calls
    page-size: 100 # 100 items each, so up to 500 scanned
```

Three consequences worth knowing, because they are visible in the UI:

1. **A search can only find what it has looked at.** The listings are ordered most-recently-updated first, so what the bound cuts off is the least recently touched — the right end to lose.
2. **A missing `totalElements` on a search response means the result set may be incomplete.** A scan that reached the end of the provider's data knows the exact total and reports it; a scan stopped by the bound reports none. The empty state reads that distinction and says so rather than claiming "no matches":

   ```
   Nothing matched in the most recently updated repositories this account
   can see. Search looks at a bounded number of them, so an older repository
   may not have been checked.
   ```

3. **`hasNext` in search mode is computed only from matches already collected**, never from "the provider might have more". The scan is deterministic from page one, so offering a next page on the strength of unscanned data would be a Next button that returns the same empty page forever.

The changed-files endpoint accepts `search` for contract consistency but the frontend never sends one: a pull request's file list is data the client already holds, so filtering it with provider calls would be waste.

**Pull-request state is different — it is filtered at the provider.** The canonical `OPEN` / `CLOSED` / `MERGED` / `ALL` goes straight through, and each provider's operation configuration declares how to spell it. A repository with thousands of closed pull requests costs one page, not a download.

---

## Pages

### Repository list — `/integrations/[providerCode]/repositories`

Two reads, **in sequence rather than in parallel**: the connection list has to resolve first because its result decides which connection the repository read uses. There is no repository call to make until we know whose credential to make it with. This is the opposite of the integrations hub, where the two reads are independent and run together with `Promise.all`.

Cards lead with the short name and put `owner/repo` underneath, because a user scanning the list is looking for "the auth service", not "acme/auth-service" — the owner is the same on most rows and repeating it at full weight would make every row start with the same word.

The search field and account switcher are rendered in **both** the success and error states. A failed read should not take away the controls that might fix it — most obviously switching accounts or clearing a search that is producing the error.

Three distinct empty states, because they call for different actions: no connected account (offers Connect), no repositories visible (offers Review granted access), and no search matches (offers Clear search).

### Repository detail — `…/repositories/[owner]/[repo]`

The repository and its pull requests are read **in parallel** — neither depends on the other, both addressed by the same two path segments — with `Promise.allSettled` rather than `Promise.all`. The two failures mean different things, and collapsing them would make a worse page: a repository that loads while its pull requests fail should still show the repository, with the failure confined to the section it belongs to.

```tsx
const [repositoryResult, pullRequestsResult] = await Promise.allSettled([…]);
```

An unrecognised `?state=` falls back to the backend's default rather than erroring. A hand-edited URL should show something sensible, and the tabs make the actual filter obvious. (The backend itself is stricter — it rejects an unknown state with a 400 — because an API client misspelling a filter should be told, not quietly served a plausible list.)

### Pull-request detail — `…/pull-requests/[pullRequestNumber]`

**Three reads in parallel**: detail, changed files, diff. None depends on another, so the page is as slow as its slowest call rather than the sum of three. `allSettled` again, and here the reason is sharper: the diff is by far the largest response and the most likely to be rate-limited or truncated, and losing it should not cost the user the details and file list, which are often enough to answer their question.

Two local decisions:

**A non-numeric or non-positive `[pullRequestNumber]` is a local `notFound()`,** not a backend round trip. It can never identify a pull request, so there is nothing to ask.

**The description is rendered as pre-wrapped plain text, not Markdown.** It is raw author-written content from the provider — untrusted user input, and a pull-request description is an obvious place to put a payload. Rendering Markdown means rendering embedded HTML, which would need a sanitiser and a dependency this app does not have. Plain text is both safe and honest about what is being shown.

```tsx
<p className="whitespace-pre-wrap … …">{detail.description}</p>
```

`notFound()` and `redirect()` work by throwing a sentinel the framework catches, so — as on the provider detail page — **every call to them sits outside any `try`**. Inside one, our own `catch` sees the sentinel first and the status is lost on the way back out: the page renders the 404 body but answers 200. Settled results are narrowed by a `asApiError` helper that rethrows anything which is not an `ApiError`, so a programming fault reaches the error boundary instead of being rendered as a friendly message that hides it.

---

## Diff viewer

Deliberately **not** a code-review editor. No syntax highlighting, no inline commenting, no side-by-side toggle, no expanding of unchanged regions. Every one of those would be scaffolding for a review feature that does not exist yet and whose shape is not yet known.

**The parse happens on the backend.** The provider returns unified-diff text; `UnifiedDiffParser` turns it into files, hunks and lines with both sets of line numbers already resolved, so this component is a map over arrays. That split is why:

- the parse is written once rather than per client — it is identical for every provider, because both providers are git;
- the fiddly line-numbering arithmetic lives in one place under 16 unit tests;
- a browser never receives a multi-megabyte string it has to walk before showing the first file;
- the size limit is enforced where the memory is.

What the component adds is the rendering decisions:

**Colour is never the only signal.** Each line carries its `+`, `-` or space in a gutter column as real text, so the diff is readable in monochrome, by anyone who cannot distinguish the tints, and when pasted.

**Line-number columns are `select-none`**, so dragging across a diff copies the code and not the gutter — the single most common thing anyone does with a diff.

**One `<tbody>` per hunk.** The gap between two hunks is meaningful: it is skipped, unchanged code. Flattening them into one line sequence would lose that boundary, which is exactly the "…" divider a diff viewer needs.

**`binary` and `truncated` are rendered differently**, because they mean "no hunks here" for different reasons and a reader must be able to tell them apart. A binary file has no textual diff and never will; a truncated one has one we chose not to render. Showing either as an empty file would report a size limit as "nothing changed".

The first five files are expanded and the rest are collapsed `<details>` — small enough that a typical pull request opens fully readable, low enough that a 300-file dependency bump does not ship 300 expanded tables.

---

## Error handling

Every failure arrives as an `ApiError` carrying the backend's `ScmErrorCode` on `.code`. `RepositoryError` translates that code to something a user can act on and keeps the backend's own text only as a fallback for codes this app has not seen — backend messages are written for an operator reading a log (`providerCode=GITHUB operationCode=LIST_REPOSITORIES status=403`).

**Rate limiting is the case that justifies the component.** A provider refusing us for a few minutes is the single most likely failure on these screens, it fixes itself, and the alternative is a bare `500 Internal Server Error` that tells the user nothing.

| Code                           | Status | What the UI says                                              |
| ------------------------------ | ------ | ------------------------------------------------------------- |
| `SCM_CONNECTION_NOT_FOUND`     | 404    | No longer available; offers Manage connections                |
| `SCM_CONNECTION_NOT_ACTIVE`    | 409    | Not active; offers reconnect                                  |
| `SCM_CONNECTION_EXPIRED`       | 401    | Credentials expired; offers reconnect                         |
| `SCM_REPOSITORY_NOT_FOUND`     | 404    | Renamed, moved, or no longer accessible                       |
| `SCM_PULL_REQUEST_NOT_FOUND`   | 404    | Whole page `notFound()` on the detail route                   |
| `SCM_OPERATION_NOT_SUPPORTED`  | 400    | This provider cannot do that                                  |
| `SCM_REQUEST_INVALID`          | 400    | Adjust the filters                                            |
| `SCM_PROVIDER_RATE_LIMITED`    | 429    | Wait a few minutes; **nothing is wrong with your connection** |
| `SCM_PROVIDER_API_ERROR`       | 502    | Usually temporary; try again shortly                          |
| `SCM_RESPONSE_MAPPING_INVALID` | 500    | Server-side configuration, not anything you did               |

`failureSuggestsReconnect` decides whether the error offers a link to the integrations hub rather than a retry, which would not help for any of the connection-state codes.

A 401 goes to `/api/auth/signout` rather than `/login`, for the dead-cookie loop reason described in the [identity feature](identity.md#the-invalid-session-loop). A Server Component cannot clear cookies.

---

## Provider parity

The same screens, the same components and the same code serve Bitbucket. Nothing in this feature branches on `providerCode` for behaviour — only for presentation metadata, which falls back gracefully for a code it has never seen.

Two provider differences are resolved **in backend configuration**, not in code, and are worth knowing because they are visible here:

**State filter spelling.** GitHub wants `open`/`closed`/`all`; Bitbucket wants `OPEN`/`MERGED`/`DECLINED` and expresses "any" as repeated parameters. Both are declared in each provider's seeded `LIST_PULL_REQUESTS` operation as `parameterValueMappings` (and `multiValueQueryParams` for the repeated case), so the canonical value passes straight through.

**"Merged" is resolved by the backend.** Bitbucket reports `state: MERGED` directly; GitHub reports `state: closed` plus a `merged_at` timestamp. The backend's mapper settles it from `mergedAt`, so a merged pull request never arrives here labelled `CLOSED` — and the state shown always matches the state filtered on.

One asymmetry remains: on GitHub, filtering by `MERGED` maps to `closed` at the provider, so the list may include closed-but-unmerged pull requests. The individual states shown are still correct.

---

## Backend contract

All paths are under the `/coderev` context path and require a Bearer token.

| Method | Path                                                  | Paginates |
| ------ | ----------------------------------------------------- | --------- |
| GET    | `/api/v1/scm/connections/{connectionId}/repositories` | yes       |
| GET    | `…/repositories/{owner}/{repo}`                       | no        |
| GET    | `…/repositories/{owner}/{repo}/pull-requests`         | yes       |
| GET    | `…/pull-requests/{pullRequestNumber}`                 | no        |
| GET    | `…/pull-requests/{pullRequestNumber}/files`           | yes       |
| GET    | `…/pull-requests/{pullRequestNumber}/diff`            | no        |

Query parameters: `page` (zero-based), `size` (1–100, **rejected** outside that range rather than clamped), `search`, and `state` on the pull-request listing.

### Authorization

Enforced in the backend's service layer, through one gate every request passes:

```
authenticated user  ──(owns)──────────────▶  connection
connection          ──(credential scope)──▶  repository
repository          ──(URL path)──────────▶  pull request
```

Three properties this feature relies on:

- **Another user's connection id answers 404, not 403.** A 403 would confirm the id exists and turn the endpoint into an oracle for enumerating other users' connections.
- **Repository access is enforced by the provider, not by a local mirror.** Every call is made with that connection's credential, so a repository the token cannot see answers 404 — and providers deliberately do not distinguish "absent" from "invisible to you".
- **A pull request is only ever resolved inside the repository named in the path**, so a number belonging to another repository resolves to nothing rather than to someone else's pull request.

No response carries a token, a token reference, a client secret or any provider configuration.

### Types

In `src/lib/api/types.ts`: `PageResponse<T>`, `RepositoryResponse`, `RepositoryOwner`, `RepositoryVisibility`, `RepositoryRefResponse`, `ScmResourceProvider`, `PullRequestResponse`, `PullRequestAuthor`, `PullRequestState`, `PullRequestFileResponse`, `FileChangeType`, `PullRequestDiffResponse`, `DiffFile`, `DiffHunk`, `DiffLine`, `DiffLineType`, `RepositoryErrorCode`, plus `splitRepositoryFullName`.

Field names are verbatim from the Java DTOs. Every DTO is `@JsonInclude(NON_NULL)`, so a field typed `?:` here is genuinely **absent** from the JSON rather than explicitly null.

---

## Files

```
src/
├── app/(app)/repositories/
│   ├── page.tsx                                   account chooser
│   └── loading.tsx
├── app/(app)/integrations/[providerCode]/repositories/
│   ├── page.tsx                                   repository list
│   ├── loading.tsx
│   └── [owner]/[repo]/
│       ├── page.tsx                               repository + PR list
│       ├── loading.tsx
│       └── pull-requests/[pullRequestNumber]/
│           ├── page.tsx                           PR detail + files + diff
│           └── loading.tsx
├── components/repositories/
│   ├── repository-card.tsx                        one repository in the list
│   ├── repository-search.tsx                      GET form, no JS
│   ├── page-nav.tsx                               prev/next links
│   ├── connection-switcher.tsx                    hidden when one account
│   ├── pull-request-row.tsx
│   ├── pull-request-state-tabs.tsx                four links, provider-side filter
│   ├── changed-files-list.tsx
│   ├── diff-viewer.tsx
│   └── repository-error.tsx                       shared failure state
└── lib/repositories/
    ├── service.ts                                 server-only endpoint wrappers
    └── presentation.ts                            wording, tones, dates, connection resolution
```

`lib/repositories/presentation.ts` is separate from `lib/scm/presentation.ts` rather than appended to it, because the two describe different things: that module is about the state of a _connection_, this one about the state of provider _resources read through_ one. It declares its own `RepositoryTone`, broader than `ScmTone`, because a merged pull request and a renamed file are neither successes nor failures and forcing them into the pass/warn/fail scale would make a repository's ordinary history look like a problem report.

### Touched elsewhere

- `src/lib/api/endpoints.ts` — six backend paths, three app routes, `pullRequestStateFilters`, `repositoryBrowseParams`.
- `src/components/scm/connection-card.tsx` — the **"Browse repositories"** link, which is the feature's entry point. Offered only on a live connection, and carries the connection id so the page reads through _that_ account rather than defaulting to the newest.
- `src/components/app/app-shell.tsx` — the Repositories row points at `/repositories` and is no longer a disabled "Soon". `NavItem` gained `activeWhen` because the feature spans two route shapes — the chooser at `/repositories` and the lists nested under `/integrations/{code}/repositories` — and prefix matching on one `href` would either miss half of them or light up Integrations at the same time, putting two `aria-current` elements in the nav.
- `src/lib/api/endpoints.ts` — `routeGuards.protectedPrefixes` gained `/repositories`.

---

## Tests

`tests/repositories.spec.ts` — 17 tests across three viewports. **48 passing, 3 skipped** against a live backend with a real GitHub connection.

What is testable here is shaped by one constraint: every backend call happens in a Server Component, so Playwright's `route()` interception — which only sees browser traffic — cannot reach it, and there is no component test runner in this project. That leaves two things, and they are the two worth having:

**The backend contract, called directly.** Authorization, pagination validation and the error vocabulary, against real HTTP, real JWT validation and real database rows:

- another user's connection answers 404, not 403
- **every one of the five nested routes** is refused, not just the entry point
- no endpoint is reachable without a bearer token
- `size=5000` and `page=-1` are rejected, not clamped
- `state=DECLINED` (a provider's word, not a canonical one) is rejected
- the page envelope publishes no fabricated total, and `last === !hasNext`
- no response body contains `accessToken`, `refreshToken`, `tokenReference`, `clientSecret` or `webhookSecret`

**Every page state reachable without a live connection** — the route guard on all three routes, the no-account empty state, the unavailable-account error, the local 404 for a malformed PR number, and the hub's Browse link carrying the right connection id.

**The populated flow** — list → search → repository → pull requests → PR detail → changed files → diff — is written and runs when the environment has a connection. It walks whatever account is connected rather than hardcoding a repository, and `test.skip`s cleanly otherwise.

Run as a real local account, since the interesting states need a connection a consent screen created:

```bash
CODEREV_TEST_USER_ID=4 \
CODEREV_TEST_USER_EMAIL=you@example.com \
npx playwright test tests/repositories.spec.ts
```

The default stays the seed row documented in `authenticated.spec.ts`. Every test is read-only.

---

## Known gaps

- **No component-level tests for the diff viewer.** There is no unit test runner in this project, and the viewer's input cannot be faked through the browser. The data it renders is covered by 16 backend parser tests; the rendering itself is covered only by the end-to-end flow test, which asserts that a diff table or an explaining message is present rather than checking individual lines.
- **Search reach is bounded** at 500 items by default. A match in a repository older than that is not found. The empty state says so rather than claiming there are no matches.
- **No cross-repository pull-request view.** The sidebar's "Pull requests" row is still a disabled "Soon" for that reason — pull requests exist only inside a repository, and there is no backend endpoint for an inbox.
- **`MERGED` on GitHub is approximate as a filter.** It maps to `closed` at the provider, so the list may include closed-but-unmerged pull requests. Individual states are still correct, because the backend resolves them from `mergedAt`.
- **No caching.** Every page load calls the provider. This is deliberate for a first implementation — measuring real usage and rate-limit pressure comes before adding a cache — but it means a provider's rate limit is the practical ceiling on how fast these pages can be used.
- **The diff is capped** at 20,000 lines and 300 files. Beyond that the response is marked `truncated` and the UI says so.
- **Totals are almost always absent**, so the UI can show "Showing 1–20" but not "of 240". That is a provider limitation, not a UI one.
- **PR descriptions render as plain text**, so Markdown appears as its source. Rendering it safely needs a sanitiser this app does not have.
