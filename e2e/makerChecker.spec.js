import { expect, test } from "@playwright/test";
import { CHECKER, MAKER, signIn } from "./helpers";

// The same flow on two lists built on the shared code-and-name screen.
for (const [list, SCREEN] of [["Religion", "/religion"], ["Occupation", "/occupation"]]) {
const code = `ZZE${list.slice(0, 1)}${Date.now().toString().slice(-6)}`;

const rowOf = (page) => page.locator("table tbody tr", { hasText: code }).first();
const open = async (page) => {
  await page.goto(SCREEN);
  await page.getByPlaceholder("Search", { exact: true }).fill(code);
  await expect(rowOf(page)).toBeVisible({ timeout: 30000 });
};
const labels = (page) => rowOf(page).locator("button").evaluateAll((buttons) => buttons.map((b) => b.getAttribute("aria-label") || b.title || b.innerText.trim()));

test.describe.serial(`maker-checker on a ZZ ${list}`, () => {
  test("the maker adds it and is not offered approval", async ({ page }) => {
    await signIn(page, MAKER);
    await page.goto(SCREEN);
    await page.getByRole("button", { name: `Add ${list}` }).click();
    const inputs = page.locator("input:visible");
    await inputs.nth(-2).fill(code);
    await inputs.nth(-1).fill(`${code} e2e test`);
    await page.getByRole("button", { name: `Add ${list}` }).last().click();
    await page.waitForTimeout(1500);
    await open(page);
    expect((await labels(page)).filter((label) => /^(approve|authori[sz]e)/i.test(label))).toEqual([]);
  });

  test("the checker approves it", async ({ page }) => {
    await signIn(page, CHECKER);
    await open(page);
    await rowOf(page).getByRole("button", { name: /^(approve|authori[sz]e)/i }).click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /approve|authori[sz]e|confirm/i }).last().click();
    await expect(rowOf(page)).not.toContainText("waiting", { timeout: 30000 });
  });

  test("the maker asks to delete it", async ({ page }) => {
    await signIn(page, MAKER);
    await open(page);
    await rowOf(page).getByRole("button", { name: "Delete" }).click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /delete|confirm/i }).last().click();
    await page.waitForTimeout(2000);
  });

  test("the checker approves the delete", async ({ page }) => {
    await signIn(page, CHECKER);
    await open(page);
    await rowOf(page).getByRole("button", { name: /^(approve|authori[sz]e)/i }).click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /approve|authori[sz]e|confirm|delete/i }).last().click();
    await page.waitForTimeout(2500);
    await page.reload();
    await page.getByPlaceholder("Search", { exact: true }).fill(code);
    await expect(rowOf(page)).toBeHidden({ timeout: 30000 });
  });
});
}
