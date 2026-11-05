import { expect } from "@playwright/test";

export const ORG = "ET";
export const MAKER = "SuperAdmin1";
export const CHECKER = "SuperAdmin2";
export const API = process.env.E2E_API ?? "https://etakuapi.innovitegrasuite.com";

export async function fillLogin(page, org, user, secret) {
  await page.goto("/login");
  for (const [name, value] of [["signin-org", org], ["signin-user", user], ["signin-secret", secret]]) {
    await page.click(`[name="${name}"]`);
    await page.keyboard.type(value);
  }
  await page.keyboard.press("Enter");
}

export async function signIn(page, user = MAKER) {
  if (!process.env.E2E_PASSWORD) throw new Error("Set E2E_PASSWORD");
  await fillLogin(page, ORG, user, process.env.E2E_PASSWORD);
  await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 60000 });
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible({ timeout: 30000 });
}

export const accessToken = (page) => page.evaluate(() => sessionStorage.getItem("access_token"));
