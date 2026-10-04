import { execFileSync } from "node:child_process";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Repository Management, exercised against the running backend.
 *
 * **What can and cannot be tested here, and why.** Every backend call in this
 * feature happens inside a Server Component, so Playwright's `route()`
 * interception — which only sees browser traffic — cannot reach it. There is no
 * component test runner in this project either. That leaves two things genuinely
 * testable, and they are the two worth testing:
 *
 * 1. **The backend contract, called directly.** Authorization, pagination
 *    validation and the error vocabulary are asserted against real HTTP, real
 *    JWT validation and real database rows. This is where the security
 *    properties live, so this is where they are checked.
 * 2. **Every page state reachable without a live SCM connection** — the route
 *    guard, the no-account empty state, the unavailable-account error, and the
 *    404 for a malformed pull-request number. These are the states a developer
 *    with a fresh database actually sees, and they are also the ones most likely
 *    to regress unnoticed.
 *
 * The populated states — a real repository list, a real diff — need a live
 * provider connection, which cannot be created without a human at a consent
 * screen. Those tests are written and **skip cleanly** when no connection
 * exists, so they are real coverage on a developer machine that has connected
 * GitHub and cost nothing on one that has not.
 *
 * Requires the backend on :8080 and a seeded user, exactly as
 * `authenticated.spec.ts` does:
 *
 *   insert into users (created_at, email, email_verified, full_name, status)
 *   values (now(), 'coderev-integration-test@example.invalid', true,
 *           'Integration Test User', 'ACTIVE');
 */

/**
 * Whose session these tests run as.
 *
 * Overridable by environment, which `authenticated.spec.ts` is not, because this
 * feature's interesting states need a real SCM connection and the account that
 * has one is whoever actually completed a consent flow on this machine — rarely
 * the synthetic seed row. Pointing the suite at that account turns a dozen
 * skipped tests into real coverage:
 *
 *   CODEREV_TEST_USER_ID=4 \
 *   CODEREV_TEST_USER_EMAIL=someone@example.com \
 *   npx playwright test tests/repositories.spec.ts
 *
 * The default stays the documented seed row, so the suite's out-of-the-box
 * behaviour is unchanged. Every test here is read-only — nothing writes through
 * the API or the UI — so running as a real local account cannot alter anything.
 */
const TEST_USER_ID = process.env.CODEREV_TEST_USER_ID ?? "1";
const TEST_USER_EMAIL =
  process.env.CODEREV_TEST_USER_EMAIL ??
  "coderev-integration-test@example.invalid";

/** Origin plus the backend's servlet context path. */
const BACKEND = "http://localhost:8080/coderev";
const APP_ORIGIN = "http://localhost:3100";

const COOKIES = {
  accessToken: "coderev_at",
  refreshToken: "coderev_rt",
  expiry: "coderev_exp",
} as const;

/**
 * A connection id that cannot exist.
 *
 * Deliberately enormous rather than merely unused: it must stay absent however
 * many connections a developer's database accumulates, and it must still be a
 * valid `Integer` on the backend so the request reaches the ownership check
 * rather than being rejected as a type mismatch.
 */
const ABSENT_CONNECTION_ID = 2_000_000_000;

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

async function seededUserAvailable(
  request: APIRequestContext,
  token: string,
): Promise<boolean> {
  const response = await request.get(`${BACKEND}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.status() === 200;
}

async function installSession(page: Page, token: string) {
  await page.context().addCookies([
    { name: COOKIES.accessToken, value: token, url: APP_ORIGIN },
    { name: COOKIES.refreshToken, value: "unused-refresh", url: APP_ORIGIN },
    {
      name: COOKIES.expiry,
      value: String(Date.now() + 890_000),
      url: APP_ORIGIN,
    },
  ]);
}

type LiveConnection = { id: number; providerCode: string };

/** The newest live connection, or null when the user has none. */
async function liveConnection(
  request: APIRequestContext,
  token: string,
): Promise<LiveConnection | null> {
  const response = await request.get(`${BACKEND}/api/v1/scm/connections`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status() !== 200) return null;

  const body = await response.json();
  const connections: {
    id: number;
    providerCode: string;
    connectionStatus: string;
  }[] = body.data ?? [];

  const live = connections.find(
    (connection) => connection.connectionStatus === "ACTIVE",
  );
  return live ? { id: live.id, providerCode: live.providerCode } : null;
}

function repositoriesUrl(connectionId: number, query = ""): string {
  return `${BACKEND}/api/v1/scm/connections/${connectionId}/repositories${query}`;
}

/* ========================================================================= *
 * Backend contract
 * ========================================================================= */

test.describe("repository API contract", () => {
  test("another user's connection answers 404, not 403", async ({ request }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );

    const response = await request.get(repositoriesUrl(ABSENT_CONNECTION_ID), {
      headers: { Authorization: `Bearer ${token}` },
    });

    // 404 rather than 403 is the deliberate choice: a 403 would confirm the id
    // exists and turn this endpoint into an oracle for enumerating other users'
    // connections. The backend's ownership check filters by user inside the
    // query, so "not yours" and "not there" are indistinguishable by design.
    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body.status).toBe("FAILED");
    expect(body.errors?.code).toBe("SCM_CONNECTION_NOT_FOUND");
  });

  test("the whole nested tree is refused for a connection that is not yours", async ({
    request,
  }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );

    const base = `${BACKEND}/api/v1/scm/connections/${ABSENT_CONNECTION_ID}/repositories/acme/api`;

    for (const path of [
      base,
      `${base}/pull-requests`,
      `${base}/pull-requests/1`,
      `${base}/pull-requests/1/files`,
      `${base}/pull-requests/1/diff`,
    ]) {
      const response = await request.get(path, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Every route is gated, not just the entry point. A single ungated nested
      // route would be the whole vulnerability.
      expect(response.status(), path).toBe(404);
      expect((await response.json()).errors?.code, path).toBe(
        "SCM_CONNECTION_NOT_FOUND",
      );
    }
  });

  test("no endpoint is reachable without a bearer token", async ({ request }) => {
    const base = `${BACKEND}/api/v1/scm/connections/1/repositories`;

    for (const path of [
      base,
      `${base}/acme/api`,
      `${base}/acme/api/pull-requests`,
      `${base}/acme/api/pull-requests/1`,
      `${base}/acme/api/pull-requests/1/files`,
      `${base}/acme/api/pull-requests/1/diff`,
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(401);
    }
  });

  test("an out-of-range page size is rejected rather than clamped", async ({
    request,
  }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );

    // Validation runs before the ownership check reaches the database, so this
    // is assertable without a real connection. Rejecting rather than clamping is
    // the point: a caller asking for 5000 and silently receiving 100 would
    // believe it had seen everything.
    const response = await request.get(
      repositoriesUrl(ABSENT_CONNECTION_ID, "?size=5000"),
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(response.status()).toBe(400);
    expect((await response.json()).errors?.code).toBe("SCM_REQUEST_INVALID");
  });

  test("a negative page is rejected", async ({ request }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );

    const response = await request.get(
      repositoriesUrl(ABSENT_CONNECTION_ID, "?page=-1"),
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(response.status()).toBe(400);
    expect((await response.json()).errors?.code).toBe("SCM_REQUEST_INVALID");
  });

  test("an unrecognised pull-request state is rejected, not silently defaulted", async ({
    request,
  }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );

    // DECLINED is a provider's word, not a canonical one. Defaulting it to OPEN
    // would answer a misspelled filter with a plausible list that does not
    // address the question asked, which is harder to notice than a 400.
    const response = await request.get(
      `${BACKEND}/api/v1/scm/connections/${ABSENT_CONNECTION_ID}/repositories/acme/api/pull-requests?state=DECLINED`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(response.status()).toBe(400);
    expect((await response.json()).errors?.code).toBe("SCM_REQUEST_INVALID");
  });

  test("a non-numeric connection id is a 400, not a 404", async ({ request }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );

    // connectionId is an Integer path variable, so Spring's type-mismatch
    // handler answers before any controller method runs.
    const response = await request.get(
      `${BACKEND}/api/v1/scm/connections/not-a-number/repositories`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(response.status()).toBe(400);
  });

  test("the listing answers a page envelope with no fabricated total", async ({
    request,
  }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );

    const connection = await liveConnection(request, token);
    test.skip(
      connection === null,
      "no live SCM connection; connect a provider to run this",
    );

    const response = await request.get(
      repositoriesUrl(connection!.id, "?page=0&size=5"),
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(response.status()).toBe(200);

    const page = (await response.json()).data;
    expect(page.page).toBe(0);
    expect(page.size).toBe(5);
    expect(Array.isArray(page.content)).toBe(true);
    expect(page.content.length).toBeLessThanOrEqual(5);
    expect(typeof page.hasNext).toBe("boolean");
    // `last` must be the negation of `hasNext`, so it stays accurate with no
    // total to derive it from.
    expect(page.last).toBe(!page.hasNext);
    expect(page.first).toBe(true);

    // Neither provider publishes a total for this listing, so the key should be
    // absent rather than invented. If a provider ever does publish one, it must
    // at least be consistent with the page size.
    if (page.totalElements !== undefined) {
      expect(page.totalPages).toBeGreaterThanOrEqual(1);
    } else {
      expect(page.totalPages).toBeUndefined();
    }
  });

  test("no repository response carries credential material", async ({
    request,
  }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );

    const connection = await liveConnection(request, token);
    test.skip(
      connection === null,
      "no live SCM connection; connect a provider to run this",
    );

    const response = await request.get(
      repositoriesUrl(connection!.id, "?size=5"),
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = await response.text();

    // The DTOs have no such fields, so this guards against one being added
    // later — which is precisely when it would matter and when nobody would
    // think to check.
    for (const forbidden of [
      "accessToken",
      "refreshToken",
      "tokenReference",
      "clientSecret",
      "webhookSecret",
    ]) {
      expect(body, forbidden).not.toContain(forbidden);
    }
  });
});

/* ========================================================================= *
 * Pages reachable without a live connection
 * ========================================================================= */

test.describe("repository pages without a connection", () => {
  test.use({ colorScheme: "dark" });

  const guardedPaths = [
    "/integrations/GITHUB/repositories",
    "/integrations/GITHUB/repositories/acme/api",
    "/integrations/GITHUB/repositories/acme/api/pull-requests/12",
  ];

  for (const path of guardedPaths) {
    test(`an anonymous visitor to ${path} is sent to sign-in`, async ({
      page,
    }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/login(\?|$)/);
      // The originally requested path is preserved for after sign-in, so the
      // user lands where they were going rather than on the dashboard.
      expect(decodeURIComponent(page.url())).toContain(path);
    });
  }

  test("the repository list explains that no account is connected", async ({
    page,
    request,
  }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );
    test.skip(
      (await liveConnection(request, token)) !== null,
      "a live connection exists, so the empty state is not reachable",
    );

    await installSession(page, token);
    await page.goto("/integrations/GITHUB/repositories");

    const main = page.getByRole("main");

    await expect(
      main.getByRole("heading", { name: "Repositories" }),
    ).toBeVisible();
    await expect(main.getByText(/No active GITHUB account/i)).toBeVisible();
    // The empty state must offer the way out, not just report the problem.
    await expect(
      main.getByRole("link", { name: /Connect GITHUB/i }),
    ).toBeVisible();
  });

  test("an unusable connection in the URL is reported, not quietly replaced", async ({
    page,
    request,
  }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );

    await installSession(page, token);
    await page.goto(
      `/integrations/GITHUB/repositories?connection=${ABSENT_CONNECTION_ID}`,
    );

    const main = page.getByRole("main");

    // Falling back to the default account here would show one account's
    // repositories under a URL naming another — a convincing lie, and two
    // accounts on the same provider often have similarly named repositories.
    await expect(
      main.getByText(/That account is not available/i),
    ).toBeVisible();
  });

  test("a malformed pull-request number is a 404 rather than a backend round trip", async ({
    page,
    request,
  }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );

    await installSession(page, token);
    await page.goto(
      "/integrations/GITHUB/repositories/acme/api/pull-requests/not-a-number",
    );

    // A non-numeric segment can never identify a pull request, so the page
    // answers locally instead of asking the provider.
    await expect(
      page.getByRole("heading", { name: /not found/i }),
    ).toBeVisible();
  });

  test("the integrations hub offers repository browsing on a live connection", async ({
    page,
    request,
  }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );

    const connection = await liveConnection(request, token);
    test.skip(
      connection === null,
      "no live SCM connection; connect a provider to run this",
    );

    await installSession(page, token);
    await page.goto("/integrations");

    // The hub is the entry point into the feature, so the link has to be there
    // and has to carry the connection id — otherwise the repository page would
    // default to a different account than the card the user clicked.
    const browse = page
      .getByRole("main")
      .getByRole("link", { name: /Browse repositories/i })
      .first();

    await expect(browse).toBeVisible();
    await expect(browse).toHaveAttribute(
      "href",
      new RegExp(
        `/integrations/${connection!.providerCode}/repositories\\?connection=${connection!.id}`,
      ),
    );
  });
});

/* ========================================================================= *
 * The full flow, when the environment has a live connection
 * ========================================================================= */

test.describe("repository browsing with a live connection", () => {
  test.use({ colorScheme: "dark" });

  test("repository list, repository, pull requests, files and diff", async ({
    page,
    request,
  }) => {
    const token = mintToken();
    test.skip(
      !(await seededUserAvailable(request, token)),
      "seeded integration test user not present",
    );

    const connection = await liveConnection(request, token);
    test.skip(
      connection === null,
      "no live SCM connection; connect a provider to run this",
    );

    // The repository the flow will walk, taken from the API rather than
    // hardcoded, so the test works against whatever account is connected.
    const listResponse = await request.get(
      repositoriesUrl(connection!.id, "?size=5"),
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const repositories = (await listResponse.json()).data?.content ?? [];
    test.skip(
      repositories.length === 0,
      "the connected account has no visible repositories",
    );

    await installSession(page, token);

    /* --- repository list --- */

    await page.goto(
      `/integrations/${connection!.providerCode}/repositories?connection=${connection!.id}`,
    );

    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { name: "Repositories" }),
    ).toBeVisible();

    const first = repositories[0];
    await expect(main.getByText(first.fullName).first()).toBeVisible();

    /* --- search narrows the list --- */

    await page.getByLabel("Search repositories").fill(first.name);
    await main.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/search=/);
    await expect(main.getByText(first.fullName).first()).toBeVisible();

    /* --- open the repository --- */

    await page.goto(
      `/integrations/${connection!.providerCode}/repositories?connection=${connection!.id}`,
    );
    await main.getByRole("link", { name: first.name, exact: true }).click();

    await expect(page).toHaveURL(
      new RegExp(`/repositories/${first.fullName.replace("/", "/")}`),
    );
    await expect(
      main.getByRole("heading", { name: "Pull requests" }),
    ).toBeVisible();
    // The state filter must be present whether or not there are pull requests.
    await expect(
      main.getByRole("link", { name: "Open", exact: true }),
    ).toBeVisible();

    /* --- open a pull request, if the repository has one --- */

    const prResponse = await request.get(
      `${BACKEND}/api/v1/scm/connections/${connection!.id}/repositories/${first.fullName}/pull-requests?state=ALL&size=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const pullRequests = (await prResponse.json()).data?.content ?? [];
    test.skip(
      pullRequests.length === 0,
      "the first repository has no pull requests",
    );

    const pullRequest = pullRequests[0];
    await page.goto(
      `/integrations/${connection!.providerCode}/repositories/${first.fullName}/pull-requests/${pullRequest.number}?connection=${connection!.id}`,
    );

    await expect(
      main.getByRole("heading", { name: "Changed files" }),
    ).toBeVisible();
    await expect(main.getByRole("heading", { name: "Diff" })).toBeVisible();

    // The diff renders as tables of lines, one per file. Either there is at
    // least one, or the page says why there is none — never a blank section.
    const diffTables = main.locator("table");
    const emptyDiff = main.getByText(
      /No diff to show|Binary file|too large to render|No line changes/i,
    );

    expect(
      (await diffTables.count()) > 0 || (await emptyDiff.count()) > 0,
    ).toBe(true);
  });
});
