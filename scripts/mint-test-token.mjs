#!/usr/bin/env node
/**
 * Mints an access token the backend will accept, for integration testing only.
 *
 *   node scripts/mint-test-token.mjs <userId>
 *
 * Signs an HS256 JWT with the same claims as `JwtTokenProvider.generateAccessToken`
 * (`sub` = user id as a string, plus `email`, `iat`, `exp`), using the local
 * development secret from `application-local.yml`. The secret is base64 and is
 * decoded before use, matching `Keys.hmacShaKeyFor(Decoders.BASE64.decode(...))`.
 *
 * This exists because sign-in requires a real GitHub consent screen, which cannot
 * be automated. It lets the authenticated routes be exercised for real rather
 * than mocked.
 *
 * It is deliberately NOT wired into the default test run: it depends on a
 * local-only secret and a seeded database row. Never point it at a deployed
 * environment.
 */

import { createHmac } from "node:crypto";
import process from "node:process";

/** Local development secret (security.jwt.secret in application-local.yml). */
const DEV_SECRET_BASE64 =
  process.env.JWT_SECRET ??
  "BkJxqiVyEijorcsnRlOyCrWSq26My/I5rkRlwR1YJDh03qByNs1U7yx3qtaPn4V/BXayh51EKZlTW6MuZ2NDHNSZrD8nuo3K7NFcS1KoThQ=";

const userId = process.argv[2];
const email = process.argv[3] ?? "coderev-integration-test@example.invalid";
/** Seconds until expiry. Negative values produce an already-expired token. */
const lifetime = Number(process.argv[4] ?? 900);

if (!userId) {
  console.error(
    "usage: node scripts/mint-test-token.mjs <userId> [email] [lifetimeSeconds]",
  );
  process.exit(1);
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const issuedAt = Math.floor(Date.now() / 1000);

const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const payload = base64url(
  JSON.stringify({
    sub: String(userId),
    email,
    iat: issuedAt,
    exp: issuedAt + lifetime,
  }),
);

const signature = createHmac("sha256", Buffer.from(DEV_SECRET_BASE64, "base64"))
  .update(`${header}.${payload}`)
  .digest("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");

process.stdout.write(`${header}.${payload}.${signature}`);
