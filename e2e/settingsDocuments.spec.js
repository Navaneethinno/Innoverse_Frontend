import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// Single-document settings share one page: each shows its document, opens it
// for editing and cancels. Nothing is proposed.
for (const [url, marker] of [["/expiryrules", "Every document of this kind"], ["/appversions", "Android"], ["/withholdingtax", null], ["/branchstaff", null]]) {
  test(`${url} shows its document and opens it for editing`, async ({ page }) => {
    test.setTimeout(120000);
    const crashes = [];
    page.on("pageerror", (error) => crashes.push(error.message));
    await signIn(page);
    await page.goto(url);
    await expect(page.getByText("History").first()).toBeVisible({ timeout: 30000 });
    if (marker) await expect(page.getByText(marker).first()).toBeVisible();
    const edit = page.getByRole("button", { name: "Edit", exact: true });
    if (await edit.count()) {
      await edit.click();
      await expect(page.getByRole("button", { name: /propose/i })).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByText("History").first()).toBeVisible();
    }
    expect(crashes).toEqual([]);
  });
}
