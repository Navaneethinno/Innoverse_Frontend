import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// One profile form serves adding and editing. Opens both and cancels.
test("the profile form opens for a new profile and for an edit", async ({ page }) => {
  await signIn(page);
  await page.goto("/profiles");
  await expect(page.locator("table")).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "New profile" }).click();
  await expect(page.getByRole("dialog", { name: "New profile" })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Create profile" })).toBeVisible();
  await page.keyboard.press("Escape");
  const edit = page.locator("table tbody tr").getByRole("button", { name: "Edit" }).first();
  if (await edit.count()) {
    await edit.click();
    await expect(page.getByRole("dialog", { name: "Edit profile" })).toBeVisible({ timeout: 20000 });
    await page.keyboard.press("Escape");
  }
});
