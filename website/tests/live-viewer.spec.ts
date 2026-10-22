import { test, expect } from "@playwright/test";

test("live viewer renders exactly one PixiJS canvas", async ({ page }) => {
  await page.goto("/live-viewer/1");

  const canvas = page.locator('[data-testid="live-viewer"] canvas');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toBeVisible();
});

test("live viewer loads every asset of the local mock scene", async ({ page }) => {
  const spriteResponses: { url: string; status: number }[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/sprites/")) {
      spriteResponses.push({ url: response.url(), status: response.status() });
    }
  });

  await page.goto("/live-viewer/1");
  await expect(page.locator('[data-testid="live-viewer"] canvas')).toBeVisible();

  const expected = ["grass.png", "water.svg", "ship1.png", "rena.png", "flag.svg", "cloud.svg"];
  await expect
    .poll(() => expected.filter((file) => !spriteResponses.some((r) => r.url.endsWith(file))))
    .toEqual([]);
  expect(spriteResponses.filter((r) => r.status >= 400)).toEqual([]);
});
