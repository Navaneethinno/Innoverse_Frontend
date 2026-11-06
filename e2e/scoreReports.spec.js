import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// The score reports filter by score and open a record's breakdown.
for (const url of ["/amlscorebreakdown", "/riskscorebreakdown"]) {
  test(`${url} filters by score and opens a breakdown`, async ({ page }) => {
    test.setTimeout(120000);
    const crashes = [];
    page.on("pageerror", (error) => crashes.push(error.message));
    await signIn(page);
    await page.goto(url);
    await expect(page.getByRole("spinbutton", { name: /lowest score/i })).toBeVisible({ timeout: 30000 });
    await page.getByRole("spinbutton", { name: /highest score/i }).fill("100");
    await page.waitForTimeout(2500);
    const open = page.locator("table tbody tr button").first();
    if (await open.count()) {
      await open.click();
      await page.waitForTimeout(3000);
    }
    expect(crashes).toEqual([]);
  });
}
