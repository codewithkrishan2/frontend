# CodeRev frontend — feature documentation

One document per feature. Each is self-contained: what it does, the routes and files involved, the contracts it depends on, and what is not built yet.

| Feature                                           | Document                                                     | State |
| ------------------------------------------------- | ------------------------------------------------------------ | ----- |
| Identity — OAuth sign-in, sessions, profile       | [`features/identity.md`](features/identity.md)               | Built |
| SCM integration — connect source-control accounts | [`features/scm-integration.md`](features/scm-integration.md) | Built |

Everything else in the product — repository indexing, pull-request review, AI analysis, billing — does not exist on either side yet. A marketing site (six pages under the `(marketing)` route group) exists but is not a feature in this sense.

Backend documentation is separate and currently only a draft at `application-services/docs/BACKEND.md`.

---

## Shared foundations

Both features sit on the same four pieces. They are described here once rather than repeated in each feature document.

### The browser never calls the backend

Every backend call happens in a Server Component, Server Action or Route Handler.

This is not a preference. It is what allows the access token to live in an httpOnly cookie that page scripts cannot read, and it is why the backend ships with CORS disabled by default. There is no `/api/backend/:path*` rewrite — `next.config.ts` records that it was deliberately removed, because it would have exposed the whole API unauthenticated.

Consequences that shape both features:

- `API_ORIGIN` is **not** `NEXT_PUBLIC_`. `serverEnv()` throws if called in the browser.
- No client-side data fetching anywhere: no react-query, no SWR, no axios, no `fetch` in a `"use client"` file.
- Server Components read; Server Actions write; `useActionState` / `useTransition` carry UI state.
- Anything needing a cross-origin navigation — a provider consent screen — is a Route Handler that redirects, never a fetch.

### The API layer — `src/lib/api/`

`endpoints.ts` holds every URL this app calls or serves. Four distinct kinds of string live there and the distinction matters: backend paths, the OAuth provider registry, the redirect contracts the backend owns, and this app's own routes. Nothing in it may import from outside the module, because `middleware.ts` pulls it into the edge runtime where `next/headers`, `server-only` and Node APIs are absent.

The backend's `/coderev` context path is one constant:

```ts
const CONTEXT_PATH = "/coderev";
const backend = (path: string) => `${CONTEXT_PATH}${path}`;
```

It is deliberately not part of `API_ORIGIN`: that variable names an _origin_, and call sites join by plain concatenation — smuggling a path in would work by accident and break the moment someone switched to `new URL()`, which discards a base path.

`server.ts` is the only HTTP client. Marked `server-only`, so an accidental client import is a build error rather than a runtime token leak. `apiRequest` unwraps the `ApiResponse` envelope, attaches `Authorization: Bearer` when given a token, defaults to `cache: "no-store"` (every response is per-user and must never be shared), and converts a connection failure into `ApiTransportError` with a message naming the likely cause. `apiRequestData` additionally asserts `data` is present, which matters because several endpoints return an envelope without it.

`types.ts` mirrors the Java DTOs. Field names are **verbatim** from the Java classes — the backend has no Jackson naming strategy, so JSON keys are the Java field names. Never rename them. OAuth callback params are the one snake_case exception.

`errors.ts` gives `ApiError` with `status`, `fieldErrors`, `code` and the getters `isUnauthorized` / `isValidationError` / `isNotFound` / `isServerError`; `ApiTransportError` is the same with `status === 0`. The backend's `errors` payload doubles as a validation map and as `{ code }` for SCM failures, so the constructor splits `code` off.

The rule, stated in the file: **branch on `status` plus `isUnauthorized`, never on message text.** The identity controllers catch their own exceptions, so statuses do not always match the global handler — `POST /auth/refresh` returns 401 where the advice would say 409.

### Route guarding

Declared once, in `endpoints.ts`, and consumed by `middleware.ts`:

```ts
export const routeGuards = {
  protectedPrefixes: ["/dashboard", "/integrations", "/scm", "/settings"],
  guestOnlyPaths: [appRoutes.login],
  returnToParam: "next",
} as const;
```

`/settings` is guarded but has no route yet. `/scm` exists for the SCM feature's connection-result landing page.

> **Status codes and streaming.** `app/loading.tsx` puts a Suspense boundary at the root, so every route streams. The HTTP status is flushed before a page finishes rendering, which means `notFound()` and in-page `redirect()` arrive in the RSC payload for the client to act on rather than as 404/307. Browsers honour them correctly; `curl` sees 200. Worth knowing before debugging a status code by hand.

### The authenticated shell — `(app)` route group

`(app)/layout.tsx` is a route group, so it adds chrome without adding a URL segment — `/dashboard` keeps its path. It mirrors how `(marketing)` wraps the public pages. Both features' authenticated pages render inside it.

Its session check is belt-and-braces: middleware already guards these prefixes. It is repeated because `config.matcher` must be a static literal that Next.js parses at build time and so cannot be derived from `routeGuards` — the two could drift, and a layout assuming a session where there is none would crash rather than redirect.

Profile-load failure is tolerated: the sidebar omits the account block, and the page — sharing the same call through React's `cache()` — reports the error with the context to explain it. Redirecting on a 401 is left to the page, because layouts and pages render concurrently and the page is the one place that can decide authoritatively.

`AppShell` is a client component (it highlights the current route and owns the mobile sheet) but `children` arrives already server-rendered, so making the chrome interactive does not pull pages into the client bundle. It renders the single `<main id="main">` that the root layout's skip link targets; pages inside must not declare their own.

Two deliberate choices:

**Sign out lives in the top bar, not the sidebar.** The bar renders at every breakpoint. Putting the control in the sidebar would mean either duplicating it into a mobile header — two elements with the same accessible name in the DOM at once — or burying it behind the nav sheet, where it is unreachable without opening the menu first.

**The mobile sheet closes on tap**, via an `onNavigate` callback the desktop rail does not pass, rather than by watching `pathname` in an effect. Closing is a consequence of the user's click, so it belongs in the handler.

Nav shows Repositories, Pull requests and Settings as disabled rows with a "Soon" badge — labelled rather than hidden, so the product's shape is visible without implying the screens exist.

```
src/components/app/
├── app-shell.tsx     sidebar rail, mobile sheet, top bar, <main>
├── nav-icons.tsx     inline 24-unit stroke glyphs
└── page-header.tsx   the h1 block every authenticated page opens with
```

### Design system

Tailwind v4, CSS-first. **There is no `tailwind.config.ts`** — all tokens are `@theme` declarations in `src/app/globals.css`. Colours are OKLCH so lightness steps stay perceptually even and accents keep their chroma against a near-black background.

- **Ramps:** `brand-*` (violet-indigo, 50–950), `accent-*` (cyan, for code and AI output), `ink-*` (neutral, slightly blue so it reads as "screen" not "print", 50–1000)
- **Review semantics:** `signal-pass`, `signal-warn`, `signal-fail`, `signal-info`
- **Surfaces:** `background`, `surface`, `surface-raised`, `foreground`, `muted-foreground`, `subtle-foreground`, `border`, `border-strong`, `ring`
- **Utilities:** `glass`, `glass-strong`, `text-display`, `text-brand-display`, `edge-highlight`, `card-halo`, `grid-lines`, `noise`, `gpu`, `no-scrollbar`, `edge-fade-x`
- **Radius:** `rounded-lg` for buttons and inputs, `rounded-xl` for cards, `rounded-full` for badges

Dark mode uses `@custom-variant dark` with `class="dark"` hardcoded on `<html>`. Keeping the variant wired means a light theme can be added later without touching component markup.

24 primitives in `src/components/ui` behind a barrel export, including `DataTable`, `Dialog`, `Tabs`, `Pagination`, `Stat`, `EmptyState` and `CodeBlock`. The barrel states the intent: these are app-agnostic, and the authenticated application imports from here rather than redefining its own.

**All icons are inline SVGs** with `aria-hidden` and `currentColor`. There is no icon dependency — `motion`, `cva`, `clsx` and `tailwind-merge` are the only runtime dependencies besides Next and React.

Reduced motion is handled globally by a `@media (prefers-reduced-motion: reduce)` block collapsing animation durations to `0.01ms`.

### Test harness

Playwright, against a **production build** on port 3100 (`next build` + `next start`), across three projects: desktop 1440×900, tablet 834×1112, mobile Pixel 7. The dev server is not used, because its overlays and HMR machinery would pollute console checks.

Assertions are role- and label-based, so new UI needs accessible names and wired `Field` labels. Where the shell and a page both show the same text — the signed-in email, for instance — assertions are scoped to `getByRole("main")` rather than the whole page, which also makes them say what they mean.

Per-feature coverage is listed in each feature document.

---

## Setup

Requirements, scripts and environment variables are in [`../README.md`](../README.md).
