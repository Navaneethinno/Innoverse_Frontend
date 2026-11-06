import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// Setups under maker-checker open a record and show its version and history.
// Looks only: nothing is proposed or approved.
const SCREENS = ["/feeschedules", "/externalproviders", "/transactionrouting", "/loanproducts", "/cardproducts", "/institutiondocuments"];

test("setup screens open a record's version and history", async ({ page }) => {
  test.setTimeout(300000);
  const crashes = [];
  page.on("pageerror", (error) => crashes.push(`${page.url()} ${error.message}`));
  await signIn(page);
  let opened = 0;
  for (const url of SCREENS) {
    await page.goto(url);
    await page.waitForTimeout(3500);
    const open = page.locator("table tbody tr").getByRole("button", { name: "View" }).first();
    if (await open.count()) {
      await open.click();
      await page.waitForTimeout(3000);
      await expect(page.getByText(/In effect|Draft|proposed/i).first()).toBeVisible({ timeout: 20000 });
      opened++;
    }
  }
  expect(crashes).toEqual([]);
  expect(opened).toBeGreaterThanOrEqual(4);
});
