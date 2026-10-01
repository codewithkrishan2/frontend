import { test } from "@playwright/test";

/**
 * Captures screenshots for visual inspection into `test-results/screens/`.
 *
 * Not assertions — this exists so the rendered page can actually be looked at
 * per viewport, including a full-page capture and per-section crops.
 */

const SECTION_SHOTS = [
  "product",
  "features",
  "how-it-works",
  "developers",
  "pricing",
  "get-started",
] as const;

test.describe("visual capture", () => {
  test.use({ colorScheme: "dark" });

  // Many full-page captures, and mobile runs at a high device pixel ratio,
  // so this needs considerably more headroom than the default 30s.
  test.setTimeout(180_000);

  test("capture page", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    const dir = "test-results/screens";

    // Reduced motion so captures are deterministic: reveals are already in
    // their final state rather than mid-transition.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    // Above the fold.
    await page.screenshot({ path: `${dir}/${project}-01-hero.png` });

    // Whole page.
    await page.screenshot({
      path: `${dir}/${project}-00-full.png`,
      fullPage: true,
    });

    // Scrolled header state.
    await page.evaluate(() => window.scrollTo(0, 700));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${dir}/${project}-02-nav-scrolled.png` });

    // Per-section crops.
    //
    // Navigating by hash rather than scrollIntoViewIfNeeded: the hash path
    // honours the section's scroll-margin, so these captures also show whether
    // headings clear the fixed header.
    let index = 3;
    for (const id of SECTION_SHOTS) {
      const section = page.locator(`#${id}`);
      if ((await section.count()) === 0) continue;

      await page.evaluate((anchor) => {
        window.location.hash = anchor;
      }, id);
      await page.waitForTimeout(700);
      await page.screenshot({
        path: `${dir}/${project}-${String(index).padStart(2, "0")}-${id}.png`,
      });
      index += 1;
    }

    // Mobile menu open state.
    if (testInfo.project.name === "mobile") {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await page.getByRole("button", { name: /open menu/i }).click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${dir}/${project}-99-menu-open.png` });
    }

    // Product showcase, findings tab active.
    await page.locator("#product").scrollIntoViewIfNeeded();
    await page.getByRole("tab", { name: "Findings" }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${dir}/${project}-98-findings-tab.png` });
  });
});
