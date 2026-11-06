import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// Individual and corporate customer types share one screen. Each lists its
// own, and its create form asks for its own fields. Nothing is created.
for (const [type, title, own, notOwn] of [
  ["individual", "Onboarding Configuration", "Minor age (years)", "Company type"],
  ["corporate", "Corporate Onboarding Configuration", "Company type", "Minor age (years)"],
]) {
  test(`${type} customer types list and ask for their own fields`, async ({ page }) => {
    test.setTimeout(120000);
    const crashes = [];
    page.on("pageerror", (error) => crashes.push(error.message));
    await signIn(page);
    await page.goto(`/customertypes?type=${type}`);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible({ timeout: 30000 });
    await expect(page.locator("table")).toBeVisible();
    const add = page.getByRole("button", { name: /^\+?\s*Add (onboarding configuration|corporate customer type)$/i });
    await expect(add.first()).toBeVisible();
    {
      await add.first().click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText(own, { exact: false }).first()).toBeVisible();
      await expect(dialog.getByText(notOwn, { exact: true })).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
    expect(crashes).toEqual([]);
  });
}
