import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// Teller forms up to their confirm button, never past it: nothing here opens a
// till, moves cash or closes the day on the shared test server.
test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.goto("/innocbs/teller");
  await expect(page.getByRole("heading", { name: "Teller" })).toBeVisible();
});

test("opening a till asks for the count and checks it against the balance", async ({ page }) => {
  await page.getByRole("button", { name: "My desk" }).click();
  await page.getByRole("button", { name: "Open till" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const confirm = dialog.getByRole("button", { name: "Open till" });
  await expect(confirm).toBeDisabled();
  // A blocked button says why.
  await confirm.locator("..").hover();
  await expect(page.getByText("Fill in the required fields first.")).toBeVisible();
  await dialog.locator("input:visible").first().fill("0.01");
  await expect(dialog.getByText("The count must match the till's balance exactly.")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

test("a new till or vault cannot be saved empty", async ({ page }) => {
  await page.getByRole("button", { name: "Tills and vaults" }).click();
  await page.getByRole("button", { name: "Add till or vault" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const save = dialog.getByRole("button", { name: /save|add|create/i }).last();
  await expect(save).toBeDisabled();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

test("a till's detail shows its balance and sessions", async ({ page }) => {
  await page.getByRole("button", { name: "Tills and vaults" }).click();
  await page.getByRole("button", { name: "View", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/balance/i).first()).toBeVisible();
});

test("the transfer queue filters without errors", async ({ page }) => {
  const crashes = [];
  page.on("pageerror", (error) => crashes.push(error.message));
  await page.getByRole("button", { name: "Cash transfers" }).click();
  for (const tab of ["Waiting for me", "Till closes waiting for me", "My requests", "All"]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await page.waitForTimeout(800);
  }
  expect(crashes).toEqual([]);
});

test("end of day shows the branch and its close button, which is not pressed", async ({ page }) => {
  await page.getByRole("button", { name: "End of day" }).click();
  await expect(page.getByRole("button", { name: "Close branch day" })).toBeVisible();
});
