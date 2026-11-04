import { afterEach, describe, expect, it } from "vitest";
import { isMerchantModule, scopedPath, setApiScope } from "./apiScope";

// The module names come from menu_array; a rename here sends merchant screens
// to the customer APIs without any error.
describe("api scope", () => {
  afterEach(() => setApiScope(null));
  it("InnoMMS is the merchant module", () => {
    expect(isMerchantModule("InnoMMS")).toBe(true);
    expect(isMerchantModule("ePurse")).toBe(false);
  });
  it("InnoMMS pages call the merchant APIs; ePurse pages the customer ones", () => {
    setApiScope("InnoMMS");
    expect(scopedPath("/customer/risk/list")).toBe("/merchant/risk/list");
    setApiScope("ePurse");
    expect(scopedPath("/customer/risk/list")).toBe("/customer/risk/list");
  });
});
