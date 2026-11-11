import { test } from "@playwright/test";
import { API, fillLogin } from "./helpers";

// Prints the first row of a few /active replies (reads only).
test("active rows", async ({ page }) => {
  await fillLogin(page, process.env.E2E_ORG ?? "AP", process.env.E2E_USER ?? "Astra1", process.env.E2E_PASSWORD);
  await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 60000 });
  const token = await page.evaluate(() => sessionStorage.getItem("access_token"));
  for (const path of ["/config/gold/product/active", "/config/gold/purity/active", "/config/treasury/counterparty/active", "/config/interest/scheme/active"]) {
    const r = await page.request.post(`${API}${path}`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, data: {} });
    const j = await r.json().catch(() => null);
    const row = Array.isArray(j?.data) ? j.data[0] : j?.data;
    console.log(path, r.status(), JSON.stringify(row)?.slice(0, 400));
  }
});
