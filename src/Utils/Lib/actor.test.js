import { describe, expect, it, vi } from "vitest";

vi.mock("i18next", () => ({ default: { t: (key, o) => (key.endsWith("_APP") || key.endsWith("_SYSTEM") || key.endsWith("_POS") ? key.split(":")[1] : o?.defaultValue ?? key.split(":")[1]) } }));
const { actorText } = await import("@/Utils/Lib/actor");

describe("actorText", () => {
  it("names an admin user as sent", () => {
    expect(actorText({ screened_by: "SuperAdmin1", screened_by_portal: "ADMIN", screened_by_channel: "WEB" }, "screened_by")).toBe("SuperAdmin1");
  });
  it("labels a customer or merchant by portal and channel, not the raw text", () => {
    expect(actorText({ created_by: "CUSTOMER/APP:+2348091100311", created_by_portal: "CUSTOMER", created_by_channel: "APP" }, "created_by")).toBe("actor_CUSTOMER_APP");
    expect(actorText({ created_by: "x", created_by_portal: "MERCHANT", created_by_channel: "POS" }, "created_by")).toBe("actor_MERCHANT_POS");
  });
  it("falls back to the portal alone when the channel is not recorded", () => {
    expect(actorText({ created_by: "CustomerPortal", created_by_portal: "CUSTOMER", created_by_channel: "" }, "created_by")).toBe("actor_CUSTOMER");
  });
  it("shows System for the platform", () => {
    expect(actorText({ screened_by: "System", screened_by_portal: "SYSTEM" }, "screened_by")).toBe("actor_SYSTEM");
  });
  it("keeps the name of an object field and an unknown portal, else the fallback", () => {
    expect(actorText({ proposed_by: { name: "Ann" } }, "proposed_by")).toBe("Ann");
    expect(actorText({}, "decided_by", "-")).toBe("-");
  });
});
