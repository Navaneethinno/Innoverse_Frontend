import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// Labels kept in settings objects, translated by their English text, follow
// the language chosen in the top bar like every other text.
test("settings labels follow the chosen language", async ({ page }) => {
  test.setTimeout(120000);
  await signIn(page);
  await page.goto("/institutionlegal");
  await page.getByRole("button", { name: "English" }).first().click();
  await page.getByText("Portuguese", { exact: true }).last().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Jurídico da Instituição", { timeout: 30000 });
  await page.getByRole("button", { name: /Portugu/ }).first().click();
  await page.getByText("English", { exact: true }).last().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Institution Legal", { timeout: 30000 });
});
