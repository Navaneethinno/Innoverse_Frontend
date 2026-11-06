import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// Looks and checks only: a proposed change would prompt real test apps to update.
test("app versions show each platform and check a change before it is proposed", async ({ page }) => {
  await signIn(page);
  await page.goto("/appversions");
  await expect(page.getByRole("heading", { name: "App Versions" })).toBeVisible();
  const table = page.locator("table");
  await expect(table.getByText("Android")).toBeVisible({ timeout: 30000 });
  await expect(table.getByText("iOS")).toBeVisible();
  await page.screenshot({ path: process.env.E2E_SHOTS ? `${process.env.E2E_SHOTS}/appversions.png` : undefined });
  await page.getByRole("button", { name: "Edit" }).click();
  // Both platforms are there, so nothing is left to add.
  await expect(page.getByRole("button", { name: /^Add / })).toHaveCount(0);
  const minimum = page.locator("label", { hasText: "Min Supported Version" }).first().locator("input");
  await minimum.fill("99.0.0");
  await expect(page.getByText("The minimum supported version cannot be above the latest version.")).toBeVisible();
  await expect(page.getByRole("button", { name: /propose/i })).toBeDisabled();
  if (process.env.E2E_SHOTS) await page.screenshot({ path: `${process.env.E2E_SHOTS}/appversions-edit.png`, fullPage: true });
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(table.getByText("Android")).toBeVisible();
});
