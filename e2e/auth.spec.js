import { expect, test } from "@playwright/test";
import { accessToken, API, fillLogin, ORG, signIn } from "./helpers";

test("an unknown user stays on the login page", async ({ page }) => {
  await fillLogin(page, ORG, "ZZnobody", "not-a-password");
  await page.waitForTimeout(3000);
  await expect(page).toHaveURL(/login/);
  expect(await accessToken(page)).toBeNull();
});

test("sign-in survives a refresh and keeps one copy of the tokens", async ({ page }) => {
  await signIn(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible({ timeout: 30000 });
  await expect(page).not.toHaveURL(/login/);
  await page.waitForTimeout(1500);
  const saved = await page.evaluate(() => sessionStorage.getItem("reduxState") ?? "");
  expect(saved).not.toMatch(/eyJ[\w-]{10,}\./);
});

test("signing out clears the browser and ends the session", async ({ page, request }) => {
  await signIn(page);
  const token = await accessToken(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForTimeout(600);
  const confirm = page.getByRole("button", { name: /^(sign out|confirm)$/i }).last();
  if (await page.url().includes("login") === false) await confirm.click().catch(() => {});
  await expect(page).toHaveURL(/login/, { timeout: 30000 });
  expect(await accessToken(page)).toBeNull();
  const reply = await request.post(`${API}/config/user/preference/get`, {
    headers: { authorization: `Bearer ${token}`, deviceinfo: '{"device_id":"e2e"}' },
    data: { key: "x" },
  });
  expect(reply.status()).toBe(401);
});
