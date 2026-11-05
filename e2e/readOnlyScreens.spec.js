import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// Open and look only: nothing here presses a button that changes money or keys.
test("teller tabs open", async ({ page }) => {
  const crashes = [];
  page.on("pageerror", (error) => crashes.push(error.message));
  await signIn(page);
  await page.goto("/innocbs/teller");
  await expect(page.getByRole("heading", { name: "Teller" })).toBeVisible();
  for (const tab of ["Cash transfers", "Tills and vaults", "End of day", "My desk"]) {
    await page.getByRole("button", { name: tab }).click();
    await page.waitForTimeout(1200);
  }
  expect(crashes).toEqual([]);
});

test("key custody status answers", async ({ page }) => {
  const reply = page.waitForResponse((r) => r.url().includes("/config/key_custody/status"), { timeout: 60000 });
  await signIn(page);
  expect((await reply).status()).toBeLessThan(500);
});
