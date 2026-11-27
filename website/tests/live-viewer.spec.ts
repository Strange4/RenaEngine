// AI contribution: Below 50% AI-generated
import { test, expect, type Page } from "@playwright/test";
import { MOCK_SCENE } from "../src/app/viewer/mockScene";

// no game server in e2e, so fake the SSE stream with the mock scene as the first change
// (retry so it doesn't reconnect during the test)
const sendMockScene = (page: Page) =>
  page.route("**/api/viewer/sse/1", (route) =>
    route.fulfill({
      headers: { "Content-Type": "text/event-stream" },
      body: `retry: 600000\nevent: change\ndata: ${JSON.stringify({ index: 1, changes: MOCK_SCENE })}\n\n`,
    }),
  );

test("live viewer renders exactly one PixiJS canvas", async ({ page }) => {
  await sendMockScene(page);
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

  await sendMockScene(page);
  await page.goto("/live-viewer/1");
  await expect(page.locator('[data-testid="live-viewer"] canvas')).toBeVisible();

  const expected = ["grass.png", "water.svg"];
  await expect
    .poll(() => expected.filter((file) => !spriteResponses.some((r) => r.url.endsWith(file))))
    .toEqual([]);
  expect(spriteResponses.filter((r) => r.status >= 400)).toEqual([]);
});
