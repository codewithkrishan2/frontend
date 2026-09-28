/**
 * Typed access to the environment variables this app reads.
 *
 * Values come from `.env.dev` or `.env.prod`, chosen by the npm script that
 * started the process (see package.json). `.env.local` overrides both, and
 * real environment variables override everything.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so they must be referenced
 * as static property accesses rather than looked up dynamically.
 */

export type AppEnv = "development" | "production";

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function required(value: string | undefined, name: string): string {
  const resolved = optional(value);

  if (!resolved) {
    throw new Error(
      `Missing environment variable ${name}. Check .env.dev / .env.prod.`,
    );
  }

  return resolved;
}

const appEnv: AppEnv =
  optional(process.env.NEXT_PUBLIC_APP_ENV) === "production"
    ? "production"
    : "development";

export const env = {
  /** Which env file was loaded: "development" or "production". */
  appEnv,

  /** Base URL the browser uses for API calls. */
  apiBaseUrl: required(
    process.env.NEXT_PUBLIC_API_BASE_URL,
    "NEXT_PUBLIC_API_BASE_URL",
  ),

  /** Public origin of this frontend. */
  siteUrl: required(process.env.NEXT_PUBLIC_SITE_URL, "NEXT_PUBLIC_SITE_URL"),

  isProduction: appEnv === "production",
  isDevelopment: appEnv === "development",
} as const;

export type Env = typeof env;
