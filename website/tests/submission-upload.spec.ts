// AI contribution: Below 50% AI-generated
import { expect, test } from "@playwright/test";
import { emptyZip } from "../src/test-utils/zip";

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    {
      name: "session_token",
      value: "PARTICIPANT-42-secret",
      url: "http://localhost:3000",
    },
  ]);
});

test("participant validates and uploads a code archive", async ({ page }) => {
  let uploaded = false;
  await page.route("**/api/upload", async (route) => {
    uploaded = true;
    await route.fulfill({ status: 202, contentType: "application/json", body: '{}' });
  });
  await page.goto("/participant");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Project archive").setInputFiles({
    name: "agent.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(emptyZip(["main.ts"])),
  });
  await expect(page.getByText("Selected: agent.zip")).toBeVisible();

  await page.getByRole("button", { name: "Upload submission" }).click();

  await expect(page.getByText("agent.zip was uploaded successfully.")).toBeVisible();
  expect(uploaded).toBe(true);
});

test("participant sees validation errors before an invalid file is sent", async ({ page }) => {
  let uploadRequests = 0;
  await page.route("**/api/upload", async (route) => {
    uploadRequests += 1;
    await route.abort();
  });
  await page.goto("/participant");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Project archive").setInputFiles({
    name: "agent.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a zip"),
  });

  await expect(page.getByText("Select a ZIP archive to upload")).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload submission" })).toBeDisabled();
  expect(uploadRequests).toBe(0);
});
