import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/Utils/Lib/institutionScope", () => ({ canChooseInstitution: () => true }));
// The tests run in node: a window with session storage and events.
const store = new Map();
vi.stubGlobal("window", {
  location: { origin: "https://x" },
  sessionStorage: {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
  dispatchEvent: () => true,
});
const { setInstitutionFilter, withInstitutionFilter } = await import("@/Utils/Lib/institutionFilter");

const post = (body = { view: "dropdown" }) => ({ method: "POST", body: JSON.stringify(body) });
const sent = (url, body) => JSON.parse(withInstitutionFilter(url, post(body)).body);

describe("withInstitutionFilter", () => {
  beforeEach(() => setInstitutionFilter("19"));

  it("adds the chosen institution to lists and dropdowns", () => {
    expect(sent("https://x/config/account/list", {})).toEqual({ inst_profile_id: 19 });
    expect(sent("https://x/config/acct/product/get_active")).toEqual({ view: "dropdown", inst_profile_id: 19 });
    expect(sent("https://x/config/loan/product/options", {})).toEqual({ inst_profile_id: 19 });
  });

  it("keeps an institution the screen sends", () => {
    expect(sent("https://x/config/acct/product/get_active", { inst_profile_id: 7 })).toEqual({ inst_profile_id: 7 });
  });

  it("leaves out the institution picker, platform masters and fixed catalogues", () => {
    for (const path of [
      "/config/institution/profile/get_active",
      "/config/institution/profile/options",
      "/config/institution/profile/list",
      "/master/currency/list",
      "/config/transaction/options",
      "/config/ledger/adjustment/options",
      "/config/card/bin/options",
      "/config/account/open/options",
      "/config/deposit/contract/options",
      "/config/loan/application/options",
    ])
      expect(sent(`https://x${path}`, {})).toEqual({});
  });

  it("sends nothing extra when no institution is chosen", () => {
    setInstitutionFilter("");
    expect(sent("https://x/config/acct/product/get_active")).toEqual({ view: "dropdown" });
  });
});
