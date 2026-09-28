import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { menuBranch, menuSlugForItem } from "@/Pages/Sidebar/menuRouteMap";
import { useMenuContext } from "@/Pages/Sidebar/menuContext";
import { matchesAction } from "@/Utils/Lib/actionAliases";

// The one permission source for every screen. Everything comes from the
// login response's menu_array: a button shows only when the user's profile
// grants that action on that exact menu. Fail-closed — a menu that isn't in
// menu_array, or an action it doesn't list, is denied. (The backend enforces
// the same rule and answers "Permission Denied" otherwise.)

export function menuHasAction(menu, action) {
  return Boolean(menu) && (menu.actions ?? []).some((a) => matchesAction(a?.action_name ?? a?.name, action));
}

const isLeaf = (menus, menu) => !menus.some((m) => String(m?.parent_menu_id) === String(menu?.menu_id));

// Menu names repeat across modules (every EPURSE menu is copied into MMS)
// and within one (Onboarding Wizard under Individual and Corporate). Among
// equal matches: the given module's first, then the original (lowest id).
function pick(menus, matches, module) {
  const inModule = module ? matches.filter((m) => m?.module_name === module) : [];
  const pool = inModule.length ? inModule : matches;
  const ranked = [...pool].sort((a, b) => Number(a.menu_id) - Number(b.menu_id));
  return ranked.find((m) => isLeaf(menus, m)) ?? ranked[0] ?? null;
}

// The menu an old one-segment URL (/<menuSlugForItem>/...) belongs to.
// Sidebar menus now open at /<module>/<menu path>, where MenuPage supplies
// the menu itself (MenuContext).
export function findMenuForPath(menus, pathname, module) {
  const slug = String(pathname ?? "").split("/").filter(Boolean)[0]?.toLowerCase();
  if (!slug) return null;
  return pick(menus, (menus ?? []).filter((m) => menuSlugForItem(m, menus) === slug), module);
}

// The Individual / Corporate halves of Onboarding Configuration and Wizard
// are now two menus of the same name under Individual and Corporate; the
// old corporate names still find the corporate one.
const BRANCH_ALIASES = {
  "corporate onboarding configuration": ["onboarding configuration", "corporate"],
  "corporate onboarding wizard": ["onboarding wizard", "corporate"],
  "onboarding configuration": ["onboarding configuration", "individual"],
  "onboarding wizard": ["onboarding wizard", "individual"],
};

// Exact menu_name match (case-insensitive). "Parent > Menu" pins a name that
// appears under more than one parent (e.g. "Corporate > Address Type").
export function findMenuByName(menus, name, module) {
  const [parent, raw] = String(name ?? "").includes(">") ? String(name).split(">").map((s) => s.trim().toLowerCase()) : [null, String(name ?? "").trim().toLowerCase()];
  const [menu, branch] = BRANCH_ALIASES[raw] ?? [raw, null];
  const matches = (menus ?? []).filter(
    (m) =>
      String(m?.menu_name ?? "").trim().toLowerCase() === menu &&
      (!parent || String(m?.parent_menu_name ?? "").trim().toLowerCase() === parent) &&
      (!branch || (menuBranch(m, menus) ?? "individual") === branch),
  );
  // A name can be both a leaf screen and a group elsewhere (e.g. "KYC"); the
  // leaf is the screen.
  return pick(menus, matches, module);
}

function buildCan(menu) {
  const can = (action) => menuHasAction(menu, action);
  can.menu = menu;
  return can;
}

// Permissions for the page the user is on: the menu it was opened from.
// `fallbackMenuName` is only used on a route outside the menu tree.
export function usePagePermission(fallbackMenuName) {
  const menus = useSelector((state) => state.menu.menuArray);
  const context = useMenuContext();
  const { pathname } = useLocation();
  const menu = useMemo(
    () => context?.menu ?? findMenuForPath(menus, pathname) ?? (fallbackMenuName ? findMenuByName(menus, fallbackMenuName) : null),
    [context, menus, pathname, fallbackMenuName],
  );
  return useMemo(() => buildCan(menu), [menu]);
}

// Permissions for a specific menu by exact name — for a screen that also
// shows a second menu's data (Onboarding Wizard's Corporate tab is menu
// "Corporate Onboarding Wizard", separate from "Onboarding Wizard").
export function useMenuPermission(menuName) {
  const menus = useSelector((state) => state.menu.menuArray);
  const module = useMenuContext()?.module;
  const menu = useMemo(() => findMenuByName(menus, menuName, module), [menus, menuName, module]);
  return useMemo(() => buildCan(menu), [menu]);
}

// The perms object getMakerCheckerButtons expects, from a `can` function.
export function makerCheckerPerms(can) {
  return {
    canView: can("View"),
    canAdd: can("Add"),
    canEdit: can("Edit"),
    canAuthorize: can("Authorize"),
    canChangeStatus: can("Change Status"),
    canDelete: can("Delete"),
  };
}

// Hook form of a single check, for code that wants one boolean.
export function useCan(action, fallbackMenuName) {
  return usePagePermission(fallbackMenuName)(action);
}
