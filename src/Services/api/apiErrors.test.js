import { describe, expect, it } from "vitest";
import store from "@/Redux/Store";
import { setMenuArray } from "@/Redux/MenuSlice";
import { getApiErrorMessage, recentInUseLinks } from "./apiErrors";

// Admin_35 §1: setup.last_in_use names its dependents from the menu tree.
describe("setup.last_in_use", () => {
  it("lists the places that use the record and what must stay", () => {
    store.dispatch(setMenuArray([{ menu_id: 64, status: 1, menu_name: "FORM_BUILDER", menu_label: "Form Builder", module_name: "EPURSE" }]));
    const payload = {
      error_code: "setup.last_in_use",
      message: "This Is The Last One And Other Settings Still Depend On It",
      remark: "never shown",
      data: [{ menu_id: 64, dependents: [{ menu_id: 64, part: "sections", available: true }], needs: [{ code: "form_field", text: "at least one form field", required: true }] }],
    };
    const text = getApiErrorMessage(payload, "x");
    expect(text).toContain("This Is The Last One");
    expect(text).toContain("Used by: Form Builder › ");
    expect(text).toContain("at least one form field");
    expect(text).not.toContain("never shown");
    expect(recentInUseLinks(text)).toEqual([expect.objectContaining({ target: { menu_id: 64, part: "sections" } })]);
  });
});
