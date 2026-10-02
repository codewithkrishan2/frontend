import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * Landing page checks: structure, interaction, overflow and console hygiene.
 *
 * Animations are disabled per-test via `prefers-reduced-motion`, except in the
 * dedicated motion test. Without that, scroll-reveal elements sit at opacity 0
 * until observed and every assertion becomes a race.
 */

/** Sections that must be present, with the heading that anchors each one. */
const SECTIONS = [
  { id: "product", heading: "A review surface built for depth" },
  { id: "features", heading: "Everything a senior reviewer would check" },
  { id: "how-it-works", heading: "Four steps, then it runs itself" },
  { id: "developers", heading: "Built to live where you already work" },
  { id: "pricing", heading: "Priced per developer, not per repo" },
  { id: "get-started", heading: "Understand your code." },
  { id: "why-coderev", heading: "Review is where engineering velocity" },
] as const;

/**
 * Collects console errors and page exceptions for the lifetime of a page.
 *
 * Favicon 404s are ignored: no icon is part of this phase, and a missing
 * favicon is not a page defect.
 */
function watchConsole(page: Page) {
  const errors: string[] = [];

  page.on("console", (message: ConsoleMessage) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/favicon/i.test(text)) return;
    errors.push(text);
  });

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  return errors;
}

/**
 * Returns descriptions of any on-screen text content sitting at (effectively)
 * zero opacity — i.e. reveal animations that never completed.
 *
 * Only text-bearing elements count. Decorative layers (hover sheens, gradient
 * overlays) are legitimately `opacity: 0` at rest, so scanning every node would
 * report those as failures.
 */
async function collectStrandedContent(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const selector = "h1, h2, h3, p, li, a, button, dt, dd, th, td";

    /** Opacity of an element including every ancestor's opacity. */
    function effectiveOpacity(element: Element): number {
      let opacity = 1;
      let node: Element | null = element;

      while (node && node !== document.documentElement) {
        opacity *= Number(getComputedStyle(node).opacity);
        if (opacity === 0) return 0;
        node = node.parentElement;
      }

      return opacity;
    }

    return Array.from(document.querySelectorAll(selector))
      .filter((element) => {
        if (element.closest("[aria-hidden='true']")) return false;
        if (!element.textContent?.trim()) return false;

        const rect = element.getBoundingClientRect();

        // Only content sitting comfortably inside the viewport. An element
        // just peeking above the fold has not met its reveal threshold yet
        // (a tall container needs ~15% visible), so flagging it would be
        // wrong — that is the animation working as designed, not a defect.
        const insetFromBottom = 200;
        if (rect.bottom < 0) return false;
        if (rect.top > window.innerHeight - insetFromBottom) return false;
        if (rect.width === 0 || rect.height === 0) return false;

        const style = getComputedStyle(element);
        if (style.visibility === "hidden") return false;
        // Screen-reader-only copies are intentionally clipped.
        if (rect.width <= 1 && rect.height <= 1) return false;

        return effectiveOpacity(element) < 0.05;
      })
      .map((element) => {
        const tag = element.tagName.toLowerCase();
        const text = element.textContent?.trim().slice(0, 60) ?? "";
        return `${tag}: "${text}"`;
      });
  });
}

/** Asserts the document is not wider than the viewport. */
async function expectNoHorizontalOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const viewport = window.innerWidth;

    // Find the widest offending element, to make failures actionable.
    let worst: { selector: string; right: number } | null = null;

    for (const element of Array.from(document.body.querySelectorAll("*"))) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right <= viewport + 1) continue;

      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none") continue;

      if (!worst || rect.right > worst.right) {
        const tag = element.tagName.toLowerCase();
        const cls = (element.getAttribute("class") ?? "").slice(0, 80);
        worst = { selector: `${tag}.${cls}`, right: rect.right };
      }
    }

    return {
      scrollWidth: doc.scrollWidth,
      viewport,
      worst,
    };
  });

  expect(
    result.scrollWidth,
    `Document scrollWidth ${result.scrollWidth} exceeds viewport ${result.viewport}. ` +
      `Widest overflowing element: ${result.worst?.selector ?? "none"} (right edge ${result.worst?.right ?? "n/a"})`,
  ).toBeLessThanOrEqual(result.viewport + 1);
}

test.describe("CodeRev landing page", () => {
  test.use({ colorScheme: "dark" });

  test("renders every section with no console errors", async ({ page }) => {
    const errors = watchConsole(page);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    // Hero
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Code review that understands",
    );

    // Every section anchor exists and is attached
    for (const section of SECTIONS) {
      const target = page.locator(`#${section.id}`);
      await expect(target, `#${section.id} should exist`).toHaveCount(1);
    }

    // Section headings are visible
    for (const section of SECTIONS) {
      await expect(
        page.getByText(section.heading, { exact: false }).first(),
        `heading for #${section.id}`,
      ).toBeVisible();
    }

    // Footer
    await expect(page.getByText(/All rights reserved/i)).toBeVisible();

    expect(errors, `Console errors:\n${errors.join("\n")}`).toEqual([]);
  });

  test("has no horizontal overflow at top or bottom of page", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    await expectNoHorizontalOverflow(page);

    // Re-check after scrolling: sticky and transformed elements can introduce
    // overflow only once they move.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    await expectNoHorizontalOverflow(page);
  });

  test("navigation opens a dedicated page per section", async ({
    page,
    isMobile,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    if (isMobile) {
      // Mobile keeps the links behind a disclosure button.
      const toggle = page.getByRole("button", { name: /open menu/i });
      await expect(toggle).toBeVisible();
      await toggle.click();
      await expect(
        page.getByRole("button", { name: /close menu/i }),
      ).toBeVisible();
    }

    const featuresLink = page
      .getByRole("navigation")
      .getByRole("link", { name: "Features" })
      .first();

    // The regression this replaces: the link used to be `#features`, so it only
    // scrolled the landing page instead of opening a page of its own.
    await expect(featuresLink).toHaveAttribute("href", "/features");

    await featuresLink.click();
    await expect(page).toHaveURL(/\/features$/);

    // The section is the page, so its heading is the document's h1 ...
    await expect(page.locator("h1")).toHaveText(
      /Everything a senior reviewer would check/i,
    );

    // ... and the rest of the landing page is not along for the ride.
    await expect(page.locator("#features")).toBeVisible();
    await expect(page.locator("#pricing")).toHaveCount(0);
    await expect(page.locator("#how-it-works")).toHaveCount(0);

    // The page ends deliberately, on the closing call to action.
    await expect(page.locator("#get-started")).toBeVisible();
  });

  test("each nav route stands alone and marks itself current", async ({
    page,
  }) => {
    const routes = [
      { path: "/product", id: "product", label: "Product" },
      { path: "/features", id: "features", label: "Features" },
      { path: "/how-it-works", id: "how-it-works", label: "How it works" },
      { path: "/pricing", id: "pricing", label: "Pricing" },
    ] as const;

    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const route of routes) {
      await page.goto(route.path, { waitUntil: "networkidle" });

      // Its own section is present, and the hero never is.
      await expect(page.locator(`#${route.id}`)).toBeVisible();
      await expect(page.locator("#stack-heading")).toHaveCount(0);

      // Exactly one h1, so the page has a usable document outline.
      await expect(page.locator("h1")).toHaveCount(1);

      // The section must clear the fixed header rather than hide beneath it.
      const top = await page
        .locator(`#${route.id}`)
        .evaluate((node) => node.getBoundingClientRect().top);
      expect(
        top,
        `${route.path} must start below the 64px header`,
      ).toBeGreaterThanOrEqual(64);
    }
  });

  test("the landing page still shows every section", async ({ page }) => {
    // The point of the split: `/` is unchanged and still tells the whole story.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    for (const id of [
      "why-coderev",
      "features",
      "product",
      "how-it-works",
      "developers",
      "pricing",
      "get-started",
    ]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });

  test("header gains its glass treatment after scrolling", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    const header = page.locator("header").first();

    const initialBorder = await header.evaluate(
      (node) => getComputedStyle(node).borderBottomColor,
    );

    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(700);

    const scrolledBorder = await header.evaluate(
      (node) => getComputedStyle(node).borderBottomColor,
    );

    expect(
      scrolledBorder,
      "header border should change once scrolled",
    ).not.toBe(initialBorder);

    // Header must remain pinned and visible.
    await expect(header).toBeVisible();
    const top = await header.evaluate(
      (node) => node.getBoundingClientRect().top,
    );
    expect(Math.round(top)).toBe(0);
  });

  test("primary and secondary CTAs are reachable and labelled", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    // Hero CTAs. "Get started" now leads to real sign-in rather than scrolling
    // to the closing section.
    const getStarted = page.getByRole("link", { name: /^Get started/ }).first();
    await expect(getStarted).toBeVisible();
    await expect(getStarted).toHaveAttribute("href", "/login");

    const howItWorks = page
      .getByRole("link", { name: /See how it works/i })
      .first();
    await expect(howItWorks).toBeVisible();

    // Keyboard reachability: the skip link is the first focusable element.
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(
      () => document.activeElement?.textContent?.trim() ?? "",
    );
    expect(focused).toContain("Skip to content");
  });

  test("product showcase tabs switch panels", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    const showcase = page.locator("#product");
    await showcase.scrollIntoViewIfNeeded();

    const findingsTab = showcase.getByRole("tab", { name: "Findings" });
    await findingsTab.click();

    await expect(findingsTab).toHaveAttribute("aria-selected", "true");

    // The findings table should now be rendered.
    await expect(
      showcase.getByRole("table"),
      "findings table should appear",
    ).toBeVisible();
    await expect(
      showcase.getByText("Signature verification skipped on session token"),
    ).toBeVisible();

    // Sorting control works.
    const severityHeader = showcase.getByRole("button", { name: /Severity/i });
    await severityHeader.click();
    await expect(showcase.getByRole("table")).toBeVisible();

    // Switch to the AI explanation panel.
    const explainTab = showcase.getByRole("tab", { name: /AI explanation/i });
    await explainTab.click();
    await expect(explainTab).toHaveAttribute("aria-selected", "true");
  });

  test("animations settle without shifting layout", async ({ page }) => {
    const errors = watchConsole(page);

    // Motion enabled here on purpose: this is the animation test.
    await page.goto("/", { waitUntil: "networkidle" });

    const widthBefore = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );

    // Walk the page top to bottom so every scroll-triggered reveal fires, and
    // verify each resting position rather than only the end state.
    const steps = 10;

    for (let index = 0; index <= steps; index += 1) {
      await page.evaluate((fraction) => {
        const maxScroll =
          document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, maxScroll * fraction);
      }, index / steps);

      // Poll rather than sleep a fixed amount: reveal durations are known but
      // scheduling under parallel test load is not, and a fixed wait makes this
      // assertion flaky instead of meaningful.
      await expect
        .poll(async () => (await collectStrandedContent(page)).join("\n"), {
          timeout: 10_000,
          intervals: [150, 250, 400, 600],
          message: `Content stranded at opacity 0 at scroll step ${index}/${steps}`,
        })
        .toBe("");

      await expectNoHorizontalOverflow(page);
    }

    const widthAfter = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );

    expect(widthAfter, "animations must not widen the document").toBe(
      widthBefore,
    );

    expect(errors, `Console errors:\n${errors.join("\n")}`).toEqual([]);
  });

  test("reduced motion renders content in its final state", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    // With motion disabled, headings must be immediately opaque.
    const opacity = await page
      .getByRole("heading", { level: 1 })
      .evaluate((node) => getComputedStyle(node).opacity);

    expect(Number(opacity)).toBe(1);

    await expect(
      page.getByText("Everything a senior reviewer would check"),
    ).toBeAttached();
  });
});
