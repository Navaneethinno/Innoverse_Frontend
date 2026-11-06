import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// Individual and corporate onboarding share one screen: each lists its own
// records, opens one read-only and shows its history. Looks only.
for (const [type, title] of [["individual", "Customer Onboarding"], ["corporate", "Corporate Customer Onboarding"]]) {
  test(`${type} onboarding lists, views and shows history`, async ({ page }) => {
    test.setTimeout(180000);
    const crashes = [];
    page.on("pageerror", (error) => crashes.push(error.message));
    await signIn(page);
    await page.goto(`/customer?type=${type}`);
    await expect(page.getByRole("heading", { name: title, exact: false }).first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator("table")).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2000);
    const row = page.locator("table tbody tr", { has: page.getByRole("button", { name: "Audit" }) }).first();
    if (await row.count()) {
      await row.getByRole("button", { name: "Audit" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
    }
    expect(crashes).toEqual([]);
  });
}
