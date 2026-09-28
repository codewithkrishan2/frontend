# Application Services — Frontend

Next.js frontend for the Spring Boot backend that lives in
`../application-services`.

This repository is currently a verified skeleton: routing, styling, linting,
formatting and shared UI primitives are in place. **API integration has not been
written yet.**

## Requirements

- Node.js 20.9 or newer (developed on 24.21)
- npm 10 or newer

## Getting started

```bash
npm install
npm run dev
```

The app is served at http://localhost:3000.

## Scripts

| Script                 | What it does                                     |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Dev server with Turbopack, loads `.env.dev`      |
| `npm run build`        | Production build, loads `.env.prod`              |
| `npm run start`        | Serves the production build, loads `.env.prod`   |
| `npm run build:dev`    | Production build using `.env.dev` instead        |
| `npm run lint`         | ESLint                                           |
| `npm run lint:fix`     | ESLint with autofix                              |
| `npm run typecheck`    | `tsc --noEmit`                                   |
| `npm run format`       | Prettier write, including Tailwind class sorting |
| `npm run format:check` | Prettier check only                              |

`next build` no longer runs ESLint (that changed in Next.js 16), so run
`npm run lint` and `npm run typecheck` separately in CI.

## Environment variables

This project uses `.env.dev` and `.env.prod` rather than Next.js' default
`.env.development` / `.env.production` names. Next.js does not pick those names
up on its own, so `scripts/with-env.mjs` loads the right file and then starts the
Next.js CLI.

Precedence, lowest to highest:

1. `.env.dev` or `.env.prod` — committed, non-secret defaults
2. `.env.local` — git-ignored, your personal or secret overrides
3. real environment variables — shell, CI, container

Real environment variables are never overwritten, so platform-level config and
CI secrets keep working without touching these files.

| Variable                   | Scope  | Purpose                                  |
| -------------------------- | ------ | ---------------------------------------- |
| `NEXT_PUBLIC_APP_ENV`      | client | Which env file was loaded                |
| `NEXT_PUBLIC_API_BASE_URL` | client | Base URL the browser uses for API calls  |
| `NEXT_PUBLIC_SITE_URL`     | client | Public origin, used for metadata         |
| `API_PROXY_ORIGIN`         | server | Spring Boot origin for the rewrite proxy |

`NEXT_PUBLIC_*` values are inlined into the client bundle **at build time**, so
they must be correct when `npm run build` runs, not just at runtime.

Read them through `src/lib/env.ts` rather than touching `process.env` directly;
missing required values fail fast there with a clear message.

### Talking to the backend

`next.config.ts` rewrites `/api/backend/*` to `API_PROXY_ORIGIN`. Because the
browser then only ever calls the Next.js origin, there is no CORS preflight and
cookies are sent without extra configuration. Point `API_PROXY_ORIGIN` at your
Spring Boot server (default `http://localhost:8080`) and leave
`NEXT_PUBLIC_API_BASE_URL` as `/api/backend`.

To call the backend directly from the browser instead, set
`NEXT_PUBLIC_API_BASE_URL` to its absolute URL and configure CORS on the Spring
Boot side.

## Project structure

```
src/
├── app/                  Routes, layouts, global styles
│   ├── layout.tsx        Root layout: fonts, header, footer, skip link
│   ├── page.tsx          Home page
│   ├── globals.css       Tailwind entry and design tokens
│   ├── error.tsx         Route error boundary
│   ├── loading.tsx       Route loading state
│   └── not-found.tsx     404 page
├── components/
│   ├── motion/           Reusable animation wrappers
│   ├── site/             Page composition: header, footer, hero
│   └── ui/               Primitives: Button, Card, Container
└── lib/
    ├── env.ts            Typed environment access
    ├── site.ts           Site name, description, nav
    └── utils.ts          cn() class merging helper
scripts/
└── with-env.mjs          Loads .env.dev / .env.prod, then runs Next.js
```

## Stack notes

- **Next.js 16.3** with the App Router and Turbopack. Server Components by
  default; add `"use client"` only where you need browser APIs or state.
- **TypeScript 6** in strict mode, plus `noUncheckedIndexedAccess` and
  unused-symbol checks. TypeScript 7 also builds fine, but its native compiler
  does not yet expose the API `typescript-eslint` needs, which breaks
  `npm run lint`. Staying on 6.x keeps the whole toolchain working.
- **Tailwind CSS 4** is configured in CSS, not JS. Design tokens live in the
  `@theme` block of `src/app/globals.css`; there is no `tailwind.config.js`.
- **Styling components**: `cva` defines variants, `cn()` (clsx +
  tailwind-merge) merges classes so later utilities win. See
  `src/components/ui/button.tsx`.
- **Animation**: `motion/react` for declarative transitions, GSAP for timeline
  work. Both respect `prefers-reduced-motion`, and `globals.css` also disables
  animation globally for users who ask for it.
- **Dark mode** is class-based: add `dark` to `<html>`. No toggle is wired up
  yet.
- **Path alias**: `@/*` maps to `src/*`.

## Next steps

1. Add `src/lib/api/` with a typed fetch client and the shared response
   envelope the backend returns.
2. Mirror the backend DTOs and enums as TypeScript types.
3. Build the auth flow (login, refresh, logout, OAuth callback) against the
   identity endpoints.
