import { describe, expect, it, vi } from "vitest";

vi.mock("@/Pages/Sidebar/menuRouteMap", () => ({ menuPage: () => ({ slugs: [] }) }));
vi.mock("@/Pages/Sidebar/menuContext", () => ({ useMenuContext: () => null }));

const { buildCan, findMenuByName } = await import("./usePermission");

const menu = (menu_id, menu_name, actions, extra = {}) => ({ menu_id, menu_name, actions: actions.map((action_name) => ({ action_name })), ...extra });

describe("can", () => {
  it("allows only what the menu lists", () => {
    const can = buildCan(menu(1, "Cards", ["Edit"]));
    expect(can("Edit")).toBe(true);
    expect(can("Delete")).toBe(false);
  });

  it("denies everything when the menu is missing", () => {
    expect(buildCan(null)("Add")).toBe(false);
  });

  it("denies everything when the menu lists no actions", () => {
    expect(buildCan({ menu_id: 1 })("Add")).toBe(false);
  });
});

describe("findMenuByName", () => {
  const menus = [menu(5, "Cards", ["Add"], { module_name: "MMS" }), menu(2, "Cards", ["Edit"], { module_name: "InnoCMS" })];

  it("finds nothing for an unknown name, so the action is denied", () => {
    expect(findMenuByName(menus, "Nope")).toBeNull();
  });

  it("takes the given module's menu first, else the original", () => {
    expect(findMenuByName(menus, "Cards", "MMS").menu_id).toBe(5);
    expect(findMenuByName(menus, "Cards").menu_id).toBe(2);
  });
});
