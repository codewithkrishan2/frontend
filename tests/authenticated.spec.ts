import { execFileSync } from "node:child_process";

import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * The authenticated half of the identity integration, exercised for real.
 *
 * Sign-in itself cannot be automated (GitHub's consent screen), so these tests
 * mint an access token with the local development signing secret — the same
 * claims `JwtTokenProvider` produces — and install it as the session cookie.
 * Everything downstream of the token is then the genuine article: real HTTP to
 * Spring Boot, real JWT validation, real database rows.
 *
 * Requires a seeded user. The whole file skips cleanly when that row is absent,
 * so it never fails for someone with a fresh database:
 *
 *   insert into users (created_at, email, email_verified, full_name, status)
 *   values (now(), 'coderev-integration-test@example.invalid', true,
 *           'Integration Test User', 'ACTIVE');
 */

const TEST_USER_ID = "1";
const TEST_USER_EMAIL = "coderev-integration-test@example.invalid";
const BASELINE_NAME = "Integration Test User";

/** Origin plus the backend's servlet context path (`server.servlet.context-path`). */
const BACKEND = "http://localhost:8080/coderev";
const APP_ORIGIN = "http://localhost:3100";

const COOKIES = {
  accessToken: "coderev_at",
  refreshToken: "coderev_rt",
  expiry: "coderev_exp",
} as const;

/** Mints a token via the dev script, so the signing logic lives in one place. */
function mintToken(lifetimeSeconds = 900): string {
  return execFileSync(
    "node",
    [
      "scripts/mint-test-token.mjs",
      TEST_USER_ID,
      TEST_USER_EMAIL,
      String(lifetimeSeconds),
    ],
    { encoding: "utf8" },
  ).trim();
}

/** True when the seeded user exists and the minted token is accepted. */
async function seededUserAvailable(
  request: APIRequestContext,
  token: string,
): Promise<boolean> {
  const response = await request.get(`${BACKEND}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.status() === 200;
}

/** Puts the user's name back, so the suite is order-independent. */
async function resetName(request: APIRequestContext, token: string) {
  await request.patch(`${BACKEND}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { fullName: BASELINE_NAME },
  });
}

test.describe("authenticated identity flows", () => {
  test.use({ colorScheme: "dark" });

  test("dashboard renders the real profile from GET /users/me", async ({
    page,
    context,
    request,
  }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );
    await resetName(request, token);

    await context.addCookies([
      { name: COOKIES.accessToken, value: token, url: APP_ORIGIN },
      { name: COOKIES.refreshToken, value: "unused-refresh", url: APP_ORIGIN },
      {
        name: COOKIES.expiry,
        value: String(Date.now() + 890_000),
        url: APP_ORIGIN,
      },
    ]);

    await page.goto("/dashboard");

    // Must not have been bounced to sign-in.
    await expect(page).toHaveURL(/\/dashboard$/);

    // Real values straight from Postgres.
    //
    // Scoped to the main region rather than the whole page: the app shell's
    // sidebar also shows the signed-in name and email, so an unscoped
    // `getByText(TEST_USER_EMAIL)` matches twice and trips strict mode. Scoping
    // also makes the assertion say what it means — that the *page* rendered the
    // profile, not merely that the chrome did.
    const main = page.getByRole("main");

    await expect(
      main.getByRole("heading", { name: BASELINE_NAME }),
    ).toBeVisible();
    await expect(main.getByText(TEST_USER_EMAIL)).toBeVisible();
    await expect(main.getByText("Active", { exact: true })).toBeVisible();
    await expect(main.getByText("Email verified")).toBeVisible();
    await expect(main.getByText(`#${TEST_USER_ID}`)).toBeVisible();
  });

  test("profile form persists a change through PATCH /users/me", async ({
    page,
    context,
    request,
  }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );
    await resetName(request, token);

    await context.addCookies([
      { name: COOKIES.accessToken, value: token, url: APP_ORIGIN },
      { name: COOKIES.refreshToken, value: "unused-refresh", url: APP_ORIGIN },
      {
        name: COOKIES.expiry,
        value: String(Date.now() + 890_000),
        url: APP_ORIGIN,
      },
    ]);

    await page.goto("/dashboard");

    const updated = `Renamed ${Date.now()}`;
    const input = page.getByLabel("Full name");
    await input.fill(updated);
    await page.getByRole("button", { name: /Save changes/i }).click();

    await expect(page.getByText("Profile updated.")).toBeVisible();

    // Verify it actually reached the database, not just the UI.
    const check = await request.get(`${BACKEND}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await check.json();
    expect(body.data.fullName).toBe(updated);

    await resetName(request, token);
  });

  test("server-side validation errors surface on the field", async ({
    page,
    context,
    request,
  }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );

    await context.addCookies([
      { name: COOKIES.accessToken, value: token, url: APP_ORIGIN },
      { name: COOKIES.refreshToken, value: "unused-refresh", url: APP_ORIGIN },
      {
        name: COOKIES.expiry,
        value: String(Date.now() + 890_000),
        url: APP_ORIGIN,
      },
    ]);

    await page.goto("/dashboard");

    // An empty name is refused client-side: the backend's `fullName` has no
    // @NotBlank, so sending "" would silently wipe the stored name.
    await page.getByLabel("Full name").fill("");
    await page.getByRole("button", { name: /Save changes/i }).click();

    await expect(page.getByText("Enter your name")).toBeVisible();

    // The stored value must be untouched.
    const check = await request.get(`${BACKEND}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await check.json();
    expect(body.data.fullName).not.toBe("");
  });

  test("signing out revokes the session and clears cookies", async ({
    page,
    context,
    request,
  }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );

    await context.addCookies([
      { name: COOKIES.accessToken, value: token, url: APP_ORIGIN },
      { name: COOKIES.refreshToken, value: "unused-refresh", url: APP_ORIGIN },
      {
        name: COOKIES.expiry,
        value: String(Date.now() + 890_000),
        url: APP_ORIGIN,
      },
    ]);

    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Sign out/i }).click();

    await expect(page).toHaveURL(/\/login(\?|$)/);

    const remaining = (await context.cookies()).map((c) => c.name);
    expect(remaining).not.toContain(COOKIES.accessToken);
    expect(remaining).not.toContain(COOKIES.refreshToken);

    // And the protected route is protected again.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test("an expired token is refused and ends the session", async ({
    page,
    context,
    request,
  }) => {
    const valid = mintToken();
    test.skip(
      !(await seededUserAvailable(request, valid)),
      "seeded integration test user not present",
    );

    // Genuinely expired, signed with the real secret — so this exercises the
    // backend's own expiry check, not a fake.
    const expired = mintToken(-60);

    await context.addCookies([
      { name: COOKIES.accessToken, value: expired, url: APP_ORIGIN },
      { name: COOKIES.refreshToken, value: "bogus-refresh", url: APP_ORIGIN },
      // Claim it is still fresh, forcing the request through to the backend
      // rather than being caught by the middleware's expiry check.
      {
        name: COOKIES.expiry,
        value: String(Date.now() + 890_000),
        url: APP_ORIGIN,
      },
    ]);

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login(\?|$)/);
    expect((await context.cookies()).map((c) => c.name)).not.toContain(
      COOKIES.refreshToken,
    );
  });
});
