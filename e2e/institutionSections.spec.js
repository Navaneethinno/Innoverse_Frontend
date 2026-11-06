import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// Each institution section opens a record's details and its history. Looks
// only: nothing is submitted or approved on the shared test server.
const SECTIONS = ["/institutionlegal", "/institutionbranding", "/institutionchannel", "/institutioncurrency", "/institutionmodule"];

test("institution sections show a record's details and history", async ({ page }) => {
  test.setTimeout(240000);
  const crashes = [];
  page.on("pageerror", (error) => crashes.push(error.message));
  await signIn(page);
  for (const url of SECTIONS) {
    await page.goto(url);
    await expect(page.locator("table")).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2000);
    // A list with no records has only its "nothing found" row.
    const row = page.locator("table tbody tr", { has: page.getByRole("button", { name: "View" }) }).first();
    if (!(await row.count())) continue;
    await row.getByRole("button", { name: "View" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await row.getByRole("button", { name: "Audit" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
  }
  expect(crashes).toEqual([]);
});
