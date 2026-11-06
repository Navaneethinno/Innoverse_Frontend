import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// A real till session on the shared test server, on our own ZZ till only: it is
// opened and closed with a count of zero, so no cash moves. The till is made
// once and reused; tills can only be deactivated, never deleted.
const TILL = "ZZE2E01";
const BRANCH = "FE Test Branch 1";

async function choose(dialog, label, option) {
  await dialog.locator("label", { hasText: label }).getByRole("button").click();
  await dialog.page().getByRole("option", { name: option }).first().click();
}

test.describe.serial("a ZZ till's session", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/innocbs/teller");
    await expect(page.getByRole("heading", { name: "Teller" })).toBeVisible();
  });

  test("the ZZ till exists", async ({ page }) => {
    await page.getByRole("button", { name: "Tills and vaults" }).click();
    await page.waitForTimeout(2500);
    if (await page.locator("table tbody tr", { hasText: TILL }).count()) return;
    await page.getByRole("button", { name: "Add till or vault" }).click();
    const dialog = page.getByRole("dialog");
    await choose(dialog, "Branch", BRANCH);
    await choose(dialog, "Currency", /MZN/);
    await dialog.locator("label", { hasText: "Code" }).locator("input").fill(TILL);
    await dialog.locator("label", { hasText: "Name" }).locator("input").fill("ZZ e2e till");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden({ timeout: 30000 });
    await page.reload();
    await page.getByRole("button", { name: "Tills and vaults" }).click();
    await expect(page.locator("table tbody tr", { hasText: TILL })).toBeVisible({ timeout: 30000 });
  });

  test("the teller opens it with a count of zero", async ({ page }) => {
    await page.getByRole("button", { name: "My desk" }).click();
    const row = page.locator("tr", { hasText: TILL });
    await expect(row).toBeVisible({ timeout: 30000 });
    await row.getByRole("button", { name: "Open till" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("input:visible").first().fill("0");
    await dialog.getByRole("button", { name: "Open till" }).click();
    await expect(dialog).toBeHidden({ timeout: 30000 });
    await expect(page.getByText(TILL).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Close till" })).toBeVisible({ timeout: 30000 });
  });

  test("the teller closes it with a count of zero", async ({ page }) => {
    await page.getByRole("button", { name: "My desk" }).click();
    await page.getByRole("button", { name: "Close till" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("input:visible").first().fill("0");
    await dialog.getByRole("button", { name: "Close till" }).click();
    await expect(dialog.getByRole("button", { name: "Close till" })).toBeHidden({ timeout: 30000 });
    // A balanced close needs nobody's approval: the till is free to open again.
    await page.reload();
    await page.getByRole("button", { name: "My desk" }).click();
    await expect(page.locator("tr", { hasText: TILL }).getByRole("button", { name: "Open till" })).toBeVisible({ timeout: 30000 });
  });
});
