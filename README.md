# CodeRev — Frontend

Marketing site for CodeRev, an AI code-intelligence platform. Built with Next.js
and Tailwind CSS.

**Phase 1 (this repository, complete):** the public landing page, plus a shared
UI component library for the application to be built on.

**Not built yet:** authentication, user dashboard, repository connection, billing,
and any backend or AI integration. The Spring Boot service in
`../application-services` is not wired up yet.

Copy on the site is marked as illustrative or preview wherever it describes
capability that has not shipped.

## Requirements

- Node.js 20.9 or newer (developed on 24.21)
- npm 10 or newer

## Getting started

```bash
npm install
npm run dev
```

The site runs at http://localhost:3000.

## Scripts

| Script              | What it does                                     |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Dev server with Turbopack, loads `.env.dev`      |
| `npm run build`     | Production build, loads `.env.prod`              |
| `npm run start`     | Serves the production build, loads `.env.prod`   |
| `npm run build:dev` | Production build using `.env.dev` instead        |
| `npm run lint`      | ESLint                                           |
| `npm run typecheck` | `tsc --noEmit`                                   |
| `npm run format`    | Prettier write, including Tailwind class sorting |
| `npm run test`      | Playwright, across desktop/tablet/mobile         |
| `npm run test:ui`   | Playwright in UI mode                            |

`next build` no longer runs ESLint (that changed in Next.js 16), so run
`npm run lint` and `npm run typecheck` separately in CI.

## Testing

Playwright drives a real browser against a **production build** at three
viewports (1440px, 834px, Pixel 7). The dev server is deliberately not used: its
HMR machinery and error overlay would pollute the console-error assertions.

`tests/landing.spec.ts` covers section rendering, anchor navigation, the mobile
menu, the scroll-aware header, CTA labelling and keyboard reachability, the
showcase tabs and sorting, horizontal overflow, reduced motion, and console
errors.

`tests/spotlight.spec.ts` covers the hero cursor spotlight: pointer tracking,
fade in and out, and that it stays off under reduced motion. It is skipped on
mobile, where hover does not exist.

`tests/screenshots.spec.ts` writes captures to `test-results/screens/` for visual
review — full page, per section, scrolled header, and the open mobile menu.

```bash
npm run build && npm run test
```

Two conventions worth keeping:

- Assertions about animated content **poll** (`expect.poll`) rather than sleeping
  a fixed amount. Reveal durations are known; scheduling under parallel load is
  not, and fixed waits made these tests flaky rather than meaningful.
- The overflow check reports the widest offending element, because
  `scrollWidth > clientWidth` on its own tells you nothing about what caused it.

## Environment variables

This project uses `.env.dev` and `.env.prod` rather than Next.js' default
`.env.development` / `.env.production` names. Next.js does not load those names on
its own, so `scripts/with-env.mjs` loads the right file and then starts the
Next.js CLI.

Precedence, lowest to highest:

1. `.env.dev` or `.env.prod` — committed, non-secret defaults
2. `.env.local` — git-ignored, personal or secret overrides
3. real environment variables — shell, CI, container

Real environment variables are never overwritten, so platform config and CI
secrets keep working without touching these files.

| Variable               | Scope  | Purpose                                      |
| ---------------------- | ------ | -------------------------------------------- |
| `NEXT_PUBLIC_APP_ENV`  | client | Which env file was loaded                    |
| `NEXT_PUBLIC_SITE_URL` | client | Public origin, used for metadata             |
| `API_ORIGIN`           | server | Spring Boot origin for all server-side calls |

`NEXT_PUBLIC_*` values are inlined into the client bundle **at build time**, so
they must be correct when `npm run build` runs, not just at runtime.

`API_ORIGIN` is deliberately **not** `NEXT_PUBLIC_`. The browser never talks to
Spring Boot directly, which is what allows the access token to live in an httpOnly
cookie. `serverEnv()` throws if it is read from client code.

`NEXT_PUBLIC_SITE_URL` must match the backend's `app.frontend-url`
(`FRONTEND_URL`), since that is where GitHub OAuth redirects back to. Changing the
port here without changing it there breaks sign-in.

Read config through `src/lib/env.ts` rather than `process.env` directly; missing
required values fail fast there with a clear message.

### No browser-facing API proxy

There used to be a `/api/backend/*` rewrite so the browser could reach Spring Boot
same-origin. It has been removed: now that every call is server-side and
authenticated, that rewrite would only be an unauthenticated, publicly reachable
door to the whole API.

## Identity integration

Sign-in is wired to the Spring Boot identity module. Endpoints consumed:

| Endpoint                        | Used by                                    |
| ------------------------------- | ------------------------------------------ |
| `GET /api/v1/oauth/github/auth` | `/api/auth/github` (redirect hop)          |
| `POST /api/v1/auth/refresh`     | `src/middleware.ts`, `getFreshAccessToken` |
| `POST /api/v1/auth/logout`      | `logoutAction`, `/api/auth/signout`        |
| `GET /api/v1/users/me`          | `/dashboard`                               |
| `PATCH /api/v1/users/me`        | `ProfileForm` via `updateProfileAction`    |
| `GET /api/health`               | test precondition                          |

There is no email/password form because the backend exposes no credential login —
GitHub OAuth is the only way in.

### How a session is established

1. `/login` links to `/api/auth/github`, which 307s to the backend's authorize
   endpoint, which 302s to GitHub. This has to be a real navigation, so it is a
   plain `<a>`, not `fetch` or `next/link`.
2. GitHub returns to the **backend** callback, which mints the token pair and
   redirects the browser to
   `/oauth-success?access_token=...&refresh_token=...`.
3. `/oauth-success` is a **Route Handler**, not a page. It reads the tokens
   server-side, writes them to httpOnly cookies, and redirects to `/dashboard`.

That third step is the important one. The obvious implementation is a client page
reading `window.location`, which would put both tokens — including a 30-day
refresh token — within reach of any injected script. Doing it in a Route Handler
means page scripts can never read them; there is a test asserting exactly that.

### Where the tokens live

`coderev_at`, `coderev_rt` and `coderev_exp` cookies: httpOnly, `SameSite=Lax`,
`Secure` outside development. `Lax` rather than `Strict` because the session is
created by a cross-site redirect — under `Strict` the browser would withhold the
cookies on that navigation and the user would arrive already signed out.

The browser never calls Spring Boot directly. Every request happens in a Server
Component, Server Action or Route Handler, which is what allows the tokens to stay
httpOnly, and incidentally means the backend needs no CORS configuration (it has
none).

### Refresh, and why it lives in middleware

`POST /auth/refresh` **rotates and revokes**: the presented refresh token is
marked revoked before the replacement is issued, and there is a single
`app_refresh_token` column per login row. Two concurrent refreshes therefore race
and the loser gets `401 Invalid refresh token`.

Next.js only permits cookie writes in middleware, Route Handlers and Server
Actions. A Server Component that refreshed mid-render could obtain new tokens but
would have no way to persist them — silently discarding the rotated refresh token
and logging the user out on their next request. So `src/middleware.ts` refreshes
proactively when `coderev_exp` says the access token is within 60 seconds of
expiry, and protected pages simply read a token that is already fresh.

### The invalid-session loop

If a page discovers its token is unusable, it redirects to `/api/auth/signout`
rather than to `/login`. A Server Component cannot clear cookies, so redirecting
straight to `/login` would leave the dead session in place; middleware would see
"a session exists", bounce the user to `/dashboard`, and loop forever. The
sign-out handler revokes the refresh token, clears the cookies, then redirects.
There is a regression test for this.

### Error shapes

`ApiError` (`src/lib/api/errors.ts`) parses the backend envelope. Two quirks worth
knowing:

- The identity controllers catch their own exceptions, so statuses do not always
  match `GlobalExceptionHandler`. `POST /auth/refresh` returns **401** for an
  `ApiException`, not the advice's 409. Branch on `status`, never on message text.
- `errors` is `Object` in Java and polymorphic in practice: a flat field→message
  map for validation failures, `{ code }` for SCM errors, absent otherwise.

Expired and missing access tokens are indistinguishable — `JwtAuthenticationEntryPoint`
returns the same 401 and message with no `WWW-Authenticate` header — so the only
correct reaction to any 401 is "refresh once, then re-authenticate".

### Testing the authenticated routes

Sign-in cannot be automated (GitHub's consent screen), so
`tests/authenticated.spec.ts` mints an access token with the local development
signing secret via `scripts/mint-test-token.mjs` — same claims as
`JwtTokenProvider` — and installs it as the session cookie. Everything downstream
is genuine: real HTTP, real JWT validation, real database rows.

It needs a seeded user, and skips cleanly without one:

```sql
insert into users (created_at, email, email_verified, full_name, status)
values (now(), 'coderev-integration-test@example.invalid', true,
        'Integration Test User', 'ACTIVE');
```

`scripts/mint-test-token.mjs` is a local development tool. It depends on a
secret that is only valid locally — never point it at a deployed environment.

## Project structure

```
src/
├── app/                    Routes, layout, global styles
│   ├── layout.tsx          Fonts, metadata, backdrop, motion provider
│   ├── page.tsx            Landing page composition
│   └── globals.css         Design tokens, utilities, keyframes
│   ├── login/              Sign-in (GitHub only)
│   ├── dashboard/          Authenticated area
│   ├── oauth-success/      Route Handler: tokens -> httpOnly cookies
│   ├── oauth-error/        Backend-reported sign-in failure
│   └── api/auth/           github (entry hop), signout (session teardown)
├── middleware.ts           Route guard + proactive token refresh
├── components/
│   ├── ui/                 Shared library — see below
│   ├── auth/               Sign-in button, profile form, logout
│   ├── motion/             Animation primitives
│   ├── marketing/          Landing page sections
│   ├── backdrop/           Page atmosphere (code field, glows, spotlight)
│   └── brand/              Logo and wordmark
├── hooks/                  useScrolledPast, usePrefersReducedMotion
└── lib/
    ├── api/                types, errors, endpoints, server fetch
    ├── auth/               cookies, session, Server Actions
    ├── env.ts              Typed config (client + serverEnv)
    ├── site.ts             Brand, nav, footer
    └── utils.ts            cn() and formatters
scripts/
├── with-env.mjs            Loads .env.dev / .env.prod, then runs Next.js
└── mint-test-token.mjs     Dev-only: signs a test JWT for integration tests
```

### Shared UI library

`src/components/ui` is written to be reused by the authenticated application,
not just this landing page. Import from the barrel:

```tsx
import { Button, DataTable, Badge } from "@/components/ui";
```

Alert, Avatar (+AvatarGroup), Badge, Button, Card, Checkbox, CodeBlock,
Container, **DataTable**, Dialog, EmptyState, Field, Input, Pagination, Progress,
Select, Separator, Skeleton, Spinner, Stat, Switch, Table primitives, Tabs,
Textarea, Tooltip.

`DataTable` is the one to know, since the app will be full of tables. It is
generic over the row type, with client-side sorting, loading skeletons and an
empty state:

```tsx
const columns: DataTableColumn<Finding>[] = [
  {
    id: "title",
    header: "Finding",
    cell: (row) => row.title,
    sortValue: (row) => row.title,
  },
  {
    id: "score",
    header: "Score",
    align: "right",
    hideBelow: "sm",
    cell: (row) => row.score,
  },
];

<DataTable
  columns={columns}
  rows={findings}
  rowKey={(row) => row.id}
  defaultSortId="score"
/>;
```

A column is sortable only if it defines `sortValue`, which avoids guessing how to
order arbitrary rendered content. `hideBelow` drops low-priority columns on small
screens rather than letting the table overflow.

## Design and animation notes

- **Dark-first.** `class="dark"` is fixed on `<html>`. The `dark:` variant is
  still wired up, so a light theme can be added without touching components.
- **Tokens, not hardcoded colours.** OKLCH scales in the `@theme` block of
  `globals.css`: `ink-*` neutrals, `brand-*` violet, `accent-*` cyan, and
  `signal-pass/warn/fail/info` for review semantics. No `tailwind.config.js` —
  Tailwind 4 is configured in CSS.
- **Reduced motion** is handled in two places, and neither branches on the
  preference in render. `MotionProvider` sets Motion's `reducedMotion="user"`,
  which drops transform animations but keeps opacity so revealed content still
  appears. CSS animations are collapsed by the global media query.

  This matters: reading the preference during render desynchronises server and
  client (the server cannot know it) and causes hydration mismatches. Where a
  component genuinely needs the value, use `usePrefersReducedMotion`, which is
  built on `useSyncExternalStore` with a server snapshot.

- **`motionTags`** holds pre-created Motion components. Calling `motion.create()`
  during render builds a new component type every pass, remounting the subtree
  and discarding its state.
- **Gradient text and transforms do not mix.** `background-clip: text` paints the
  background clipped to glyph geometry, so a `transform` on a _descendant_ moves
  the glyphs out from under it and the text renders invisible. `TextReveal`
  therefore applies gradients per word, via `wordClassName`, on the element that
  actually moves. Use a vertical gradient there — a horizontal one restarts on
  each word and looks striped.
- **Decorative overflow must be clipped.** `SectionGlow` is wider than its
  container by design; it wraps itself in an `inset-0 overflow-hidden` layer,
  because an unclipped glow hanging off the right edge widens the document and
  produces a horizontal scrollbar at every viewport.
- **The hero code field** (`backdrop/code-field.tsx`) is a seeded, deterministic
  character grid rendered as `<pre>` in a server component: no JavaScript for the
  text, a handful of text nodes instead of thousands of spans, and stable between
  server and client. Never `Math.random()` there.
- **The cursor spotlight** lights up the characters under the pointer. It is two
  stacked copies of the same grid — a dim base, and a bright copy whose
  `mask-image` is a circle centred on the cursor. `SpotlightSection` publishes the
  pointer position as `--spot-x` / `--spot-y` / `--spot-opacity`.

  Nothing goes through React state: coordinates are written directly to inline
  style and coalesced into one `requestAnimationFrame` per frame, so a moving
  cursor never triggers a re-render. Only `mouse` pointers are tracked, and the
  whole thing is skipped under reduced motion, where the CSS fallbacks leave a
  static centred glow. Both variables have fallbacks, so it also looks right
  before the first pointer event.

## Dependencies

Runtime: `next`, `react`, `react-dom`, `motion`, `class-variance-authority`,
`clsx`, `tailwind-merge`. That is the whole list.

Two notes on what is _not_ here:

- **GSAP was removed.** It ended up unused once the animations settled on Motion
  and CSS, and it is ~70KB for nothing. Reinstall it if you want timeline work in
  phase 2.
- **TypeScript is 6.x, not 7.** TypeScript 7 builds fine, but its native compiler
  does not expose the API `typescript-eslint` needs, so `npm run lint` fails
  outright. Staying on 6.x keeps the whole toolchain working.
