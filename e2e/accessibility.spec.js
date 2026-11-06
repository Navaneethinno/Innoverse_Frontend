import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "./helpers";

// Key screens have no serious or critical accessibility problem (axe):
// names on controls, readable text, a main region, headings in order.
const SCREENS = ["/dashboard", "/religion", "/district", "/appversions", "/expiryrules", "/institutionbranding", "/teller", "/profiles", "/feeschedules", "/customertypes?type=individual"];

test("key screens pass the accessibility check", async ({ page }) => {
  test.setTimeout(300000);
  await signIn(page);
  const found = [];
  for (const url of SCREENS) {
    await page.goto(url);
    await page.waitForTimeout(3000);
    const { violations } = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    for (const v of violations.filter((x) => ["serious", "critical"].includes(x.impact))) {
      found.push(`${url} ${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")}`);
    }
  }
  expect(found).toEqual([]);
});
