import { test } from "@playwright/test";
import { fillLogin } from "./helpers";

// Screenshots of a few screens (reads only), slugs from E2E_SLUGS.
test("screens", async ({ page }) => {
  test.setTimeout(600000);
  await fillLogin(page, process.env.E2E_ORG ?? "AP", process.env.E2E_USER ?? "Astra1", process.env.E2E_PASSWORD);
  await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 60000 });
  for (const slug of (process.env.E2E_SLUGS ?? "").split(",").filter(Boolean)) {
    await page.goto(`/${slug}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${process.env.E2E_SHOTS}/p-${slug}.png` });
  }
});
