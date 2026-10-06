import { test, expect } from "@playwright/test";

test("live viewer renders exactly one PixiJS canvas", async ({ page }) => {
  await page.goto("/live-viewer/1");

  const canvas = page.locator('[data-testid="live-viewer"] canvas');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toBeVisible();
});
