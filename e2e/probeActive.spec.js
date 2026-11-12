import { test } from "@playwright/test";
import { fillLogin } from "./helpers";

// Screenshots of a few screens (reads only), slugs from E2E_SLUGS. E2E_LANG
// (the language's name in the header dropdown, e.g. "Português") switches
// the language first.
test("screens", async ({ page }) => {
  test.setTimeout(600000);
  await fillLogin(page, process.env.E2E_ORG ?? "AP", process.env.E2E_USER ?? "Astra1", process.env.E2E_PASSWORD);
  await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 60000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  if (process.env.E2E_LANG) {
    await page.getByRole("button", { name: /English/ }).first().click();
    await page.getByText(process.env.E2E_LANG, { exact: false }).first().click();
    await page.waitForTimeout(1500);
  }
  for (const slug of (process.env.E2E_SLUGS ?? "").split(",").filter(Boolean)) {
    await page.goto(`/${slug}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${process.env.E2E_SHOTS}/p-${slug}.png` });
  }
});
