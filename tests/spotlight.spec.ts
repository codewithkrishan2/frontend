import { expect, test } from "@playwright/test";

/**
 * The hero's cursor spotlight.
 *
 * Verifies the pointer position actually reaches the DOM as CSS custom
 * properties, that the highlight layer fades in and out, and that it stays off
 * for reduced-motion users.
 */
test.describe("hero cursor spotlight", () => {
  test.use({ colorScheme: "dark" });

  test("follows the pointer and fades in and out", async ({
    page,
    isMobile,
  }) => {
    // Hover is a mouse-only affordance; there is nothing to assert on touch.
    test.skip(isMobile, "no hover on touch devices");

    await page.goto("/", { waitUntil: "networkidle" });

    const hero = page.locator("section").first();

    // Before any pointer movement the variables are unset, so the CSS
    // fallbacks apply and the highlight is hidden.
    const initial = await hero.evaluate((node) => ({
      opacity: node.style.getPropertyValue("--spot-opacity"),
      x: node.style.getPropertyValue("--spot-x"),
    }));
    expect(initial.opacity).toBe("");
    expect(initial.x).toBe("");

    // Move into the hero, away from the centre so the spotlight lands on the
    // character field rather than the cleared middle.
    const box = await hero.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.move(box.x + 120, box.y + 220);
    await page.mouse.move(box.x + 160, box.y + 240);
    await page.waitForTimeout(250);

    const active = await hero.evaluate((node) => ({
      opacity: node.style.getPropertyValue("--spot-opacity"),
      x: node.style.getPropertyValue("--spot-x"),
      y: node.style.getPropertyValue("--spot-y"),
    }));

    expect(active.opacity, "spotlight should fade in on enter").toBe("1");
    expect(active.x, "pointer x should be published").toMatch(
      /^\d+(\.\d+)?px$/,
    );
    expect(active.y, "pointer y should be published").toMatch(
      /^\d+(\.\d+)?px$/,
    );

    // The highlight layer should actually be rendering. Polled, because it
    // fades in over 500ms and a fixed wait would read it mid-transition.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const highlight = Array.from(document.querySelectorAll("pre")).find(
              (node) => node.style.maskImage.includes("--spot-x"),
            );
            return highlight
              ? Number(getComputedStyle(highlight).opacity)
              : null;
          }),
        {
          timeout: 5000,
          message: "highlight layer should fade in",
        },
      )
      .toBeGreaterThan(0.9);

    // Tracking should follow a second move.
    await page.mouse.move(box.x + 420, box.y + 300);
    await page.waitForTimeout(200);

    const moved = await hero.evaluate((node) =>
      node.style.getPropertyValue("--spot-x"),
    );
    expect(moved).not.toBe(active.x);

    // Leaving the hero fades it back out.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 400);

    await expect
      .poll(
        () =>
          hero.evaluate((node) =>
            node.style.getPropertyValue("--spot-opacity"),
          ),
        { timeout: 5000, message: "spotlight should fade out on leave" },
      )
      .toBe("0");
  });

  test("stays off under reduced motion", async ({ page, isMobile }) => {
    test.skip(isMobile, "no hover on touch devices");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    const hero = page.locator("section").first();
    const box = await hero.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + 140, box.y + 240);
    await page.waitForTimeout(250);

    const opacity = await hero.evaluate((node) =>
      node.style.getPropertyValue("--spot-opacity"),
    );

    expect(opacity, "no spotlight tracking under reduced motion").toBe("");
  });

  test("capture spotlight", async ({ page, isMobile }, testInfo) => {
    test.skip(isMobile, "no hover on touch devices");

    await page.goto("/", { waitUntil: "networkidle" });
    // Let the entrance animations finish so the capture is about the spotlight.
    await page.waitForTimeout(2200);

    const hero = page.locator("section").first();
    const box = await hero.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + 250, box.y + 200);
    await page.mouse.move(box.x + 260, box.y + 210);
    await page.waitForTimeout(800);

    await page.screenshot({
      path: `test-results/screens/${testInfo.project.name}-97-spotlight.png`,
    });
  });
});
