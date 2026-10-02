import { expect, test, type Page } from "@playwright/test";

/**
 * Identity integration against the running Spring Boot backend.
 *
 * What is NOT covered: a fully authenticated session. That requires a real
 * provider consent screen, which cannot be automated here. Everything up to and
 * including the token hand-off is covered, plus the invalid-session paths — which
 * is where the interesting bugs live.
 *
 * Requires the backend on API_ORIGIN (http://localhost:8080 by default).
 */

/** Origin plus the backend's servlet context path (`server.servlet.context-path`). */
const BACKEND = "http://localhost:8080/coderev";

const COOKIES = {
  accessToken: "coderev_at",
  refreshToken: "coderev_rt",
  expiry: "coderev_exp",
} as const;

/**
 * Mirrors `oauthProviders` in `src/lib/api/endpoints.ts`.
 *
 * Deliberately duplicated rather than imported: these tests assert the URLs the
 * app actually serves, so sharing the constant would let a wrong path agree with
 * itself and pass.
 */
const PROVIDERS = [
  { id: "github", label: "GitHub" },
  { id: "bitbucket", label: "Bitbucket" },
] as const;

async function cookieNames(page: Page): Promise<string[]> {
  const cookies = await page.context().cookies();
  return cookies.map((cookie) => cookie.name);
}

test.describe("identity", () => {
  test.use({ colorScheme: "dark" });

  test("backend is reachable and speaks the expected envelope", async ({
    request,
  }) => {
    // Guards against the whole suite failing confusingly when the API is down.
    const response = await request.get(`${BACKEND}/api/v1/health`);

    expect(
      response.status(),
      "Spring Boot must be running on :8080 for these tests",
    ).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ status: "SUCCESS", data: "UP" });
  });

  test("protected route redirects an anonymous visitor to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login(\?|$)/);
    // The originally requested path is preserved for after sign-in.
    expect(page.url()).toContain("next=%2Fdashboard");
    await expect(
      page.getByRole("heading", { name: /Sign in to CodeRev/i }),
    ).toBeVisible();
  });

  test("sign-in page offers every OAuth provider and no password", async ({
    page,
  }) => {
    await page.goto("/login");

    for (const provider of PROVIDERS) {
      const link = page.getByRole("link", {
        name: new RegExp(`Continue with ${provider.label}`, "i"),
      });
      await expect(link).toBeVisible();
      // Must point at our own handler, never at the backend origin directly.
      await expect(link).toHaveAttribute("href", `/api/auth/${provider.id}`);
    }

    // The backend exposes no credential login, so no password field should exist.
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  });

  for (const provider of PROVIDERS) {
    test(`the ${provider.label} entry point redirects to the backend authorize endpoint`, async ({
      request,
    }) => {
      const response = await request.get(`/api/auth/${provider.id}`, {
        maxRedirects: 0,
      });

      expect(response.status()).toBe(307);
      expect(response.headers()["location"]).toBe(
        `${BACKEND}/api/v1/oauth/${provider.id}/auth`,
      );
      expect(response.headers()["cache-control"]).toContain("no-store");
    });
  }

  test("an unknown provider is rejected rather than proxied", async ({
    request,
  }) => {
    // The [provider] segment is untrusted input; it must not be concatenated
    // into a backend URL.
    const response = await request.get("/api/auth/gitlab", {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(404);
  });

  test("the sign-out handler is not shadowed by the provider route", async ({
    request,
  }) => {
    // `/api/auth/signout` is a static sibling of `/api/auth/[provider]`. Next.js
    // matches static segments first, but a regression here would silently turn
    // sign-out into a 404 and strand users with a dead session.
    const response = await request.get("/api/auth/signout", {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(303);
    expect(response.headers()["location"]).toContain("/login");
  });

  test("oauth-success converts query tokens into httpOnly cookies", async ({
    request,
  }) => {
    // Inspect the handler's own response rather than navigating, because
    // following the redirect would land on /dashboard, be refused by the backend
    // (these are stand-in tokens), and correctly clear the very cookies under
    // test before they could be read.
    const response = await request.get(
      "/oauth-success?access_token=test-access-token&refresh_token=test-refresh-token",
      { maxRedirects: 0 },
    );

    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toContain("/dashboard");

    const setCookies = response
      .headersArray()
      .filter((header) => header.name.toLowerCase() === "set-cookie")
      .map((header) => header.value);

    const access = setCookies.find((value) =>
      value.startsWith(`${COOKIES.accessToken}=`),
    );
    const refresh = setCookies.find((value) =>
      value.startsWith(`${COOKIES.refreshToken}=`),
    );
    const expiry = setCookies.find((value) =>
      value.startsWith(`${COOKIES.expiry}=`),
    );

    expect(access).toContain("test-access-token");
    expect(refresh).toContain("test-refresh-token");

    // The whole point of doing this in a Route Handler: page scripts must never
    // be able to read either token.
    expect(access, "access token must be httpOnly").toContain("HttpOnly");
    expect(refresh, "refresh token must be httpOnly").toContain("HttpOnly");
    // Lax, not Strict: the session is established by a cross-site redirect back
    // from GitHub, and Strict would withhold the cookie on that navigation.
    // Attribute casing is not normalised, so compare case-insensitively.
    expect(access?.toLowerCase()).toContain("samesite=lax");
    expect(access).toContain("Path=/");
    // This suite runs against a production build, where the cookies must also
    // be Secure.
    expect(access).toContain("Secure");

    // The expiry cookie carries an absolute deadline in the future.
    const expiryValue = Number(
      expiry?.split(";")[0]?.split("=")[1] ?? Number.NaN,
    );
    expect(expiryValue).toBeGreaterThan(Date.now());
  });

  test("tokens never become readable by page scripts", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: COOKIES.accessToken,
        value: "secret-access-token",
        url: "http://localhost:3100",
        httpOnly: true,
      },
      {
        name: COOKIES.refreshToken,
        value: "secret-refresh-token",
        url: "http://localhost:3100",
        httpOnly: true,
      },
    ]);

    await page.goto("/login");

    const visibleToScripts = await page.evaluate(() => document.cookie);
    expect(visibleToScripts).not.toContain("secret-access-token");
    expect(visibleToScripts).not.toContain("secret-refresh-token");
  });

  test("oauth-success without tokens lands on the error page", async ({
    page,
  }) => {
    await page.goto("/oauth-success");

    await expect(page).toHaveURL(/\/oauth-error\?/);
    await expect(
      page.getByRole("heading", { name: /could not sign you in/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/did not return a valid session/i),
    ).toBeVisible();

    // No session should have been created.
    expect(await cookieNames(page)).not.toContain(COOKIES.refreshToken);
  });

  test("oauth-error renders the backend's message as text", async ({
    page,
  }) => {
    const message = "GitHub authentication was denied";
    await page.goto(`/oauth-error?message=${encodeURIComponent(message)}`);

    await expect(page.getByText(message)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Try again/i }),
    ).toHaveAttribute("href", "/login");
  });

  test("an invalid session is cleared instead of looping", async ({
    page,
    context,
  }) => {
    // The important regression: cookies that look like a live session but are
    // rejected by the backend. Middleware sees "signed in" and allows the render;
    // the dashboard then gets a 401. Redirecting straight to /login would leave
    // the cookies in place, so middleware would bounce the user back to
    // /dashboard — an infinite loop. Hence the sign-out handler.
    //
    // Cookies are installed directly rather than via /oauth-success so the test
    // starts from an unambiguous state.
    await context.addCookies([
      {
        name: COOKIES.accessToken,
        value: "forged-token",
        url: "http://localhost:3100",
      },
      {
        name: COOKIES.refreshToken,
        value: "forged-refresh",
        url: "http://localhost:3100",
      },
      {
        name: COOKIES.expiry,
        // Claim freshness so middleware lets the request through to the backend.
        value: String(Date.now() + 800_000),
        url: "http://localhost:3100",
      },
    ]);

    // Calls GET /users/me and is refused.
    await page.goto("/dashboard");

    // Should end at sign-in, with the dead session removed.
    await expect(page).toHaveURL(/\/login(\?|$)/);
    await expect(
      page.getByRole("heading", { name: /Sign in to CodeRev/i }),
    ).toBeVisible();

    const remaining = await cookieNames(page);
    expect(remaining).not.toContain(COOKIES.refreshToken);
    expect(remaining).not.toContain(COOKIES.accessToken);

    // And staying on /login must not bounce anywhere now.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("an expired access token triggers a refresh attempt", async ({
    page,
    context,
  }) => {
    // Access token already expired, so middleware must try to refresh before
    // rendering. The backend rejects the bogus refresh token, so the user is
    // sent to sign-in rather than seeing a broken dashboard.
    await context.addCookies([
      {
        name: COOKIES.accessToken,
        value: "expired-access-token",
        url: "http://localhost:3100",
      },
      {
        name: COOKIES.refreshToken,
        value: "bogus-refresh-token",
        url: "http://localhost:3100",
      },
      {
        name: COOKIES.expiry,
        // Well in the past.
        value: String(Date.now() - 60_000),
        url: "http://localhost:3100",
      },
    ]);

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login(\?|$)/);
    expect(await cookieNames(page)).not.toContain(COOKIES.refreshToken);
  });

  test("landing page CTAs lead to sign-in", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const heroCta = page.getByRole("link", { name: /^Get started/ }).first();
    await expect(heroCta).toHaveAttribute("href", "/login");

    await heroCta.click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
