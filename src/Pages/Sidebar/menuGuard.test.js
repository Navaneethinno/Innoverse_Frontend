import { describe, expect, it } from "vitest";
import { slugDenied } from "./menuRouteMap";

const active = (menu_name) => ({ menu_id: menu_name, menu_name, status: 1 });

describe("slugDenied", () => {
  const menus = [active("Transactions")];

  it("allows a menu page the user has", () => {
    expect(slugDenied(menus, "/transactions")).toBe(false);
    expect(slugDenied(menus, "/transactions/12")).toBe(false);
  });

  it("denies a menu page the user does not have", () => {
    expect(slugDenied(menus, "/amlcases/95")).toBe(true);
  });

  it("denies a page whose menu is switched off", () => {
    expect(slugDenied([{ ...active("AML Cases"), status: 0 }], "/amlcases")).toBe(true);
  });

  it("leaves pages that belong to no menu alone", () => {
    expect(slugDenied(menus, "/notifications")).toBe(false);
    expect(slugDenied(menus, "/dashboard")).toBe(false);
    expect(slugDenied(menus, "/")).toBe(false);
  });

  it("blocks nothing before the menu has loaded", () => {
    expect(slugDenied([], "/amlcases")).toBe(false);
    expect(slugDenied(null, "/amlcases")).toBe(false);
  });
});
