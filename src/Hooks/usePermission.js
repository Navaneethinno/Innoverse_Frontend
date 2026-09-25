import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { menuSlugForItem } from "@/Pages/Sidebar/menuRouteMap";
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

// The menu the current URL belongs to: the sidebar navigates to
// /<menuSlugForItem>/<uuid>, so reversing that slug finds the exact menu
// (menu_id), refresh-safe, with no hand-typed menu names.
export function findMenuForPath(menus, pathname) {
  const slug = String(pathname ?? "").split("/").filter(Boolean)[0]?.toLowerCase();
  if (!slug) return null;
  const matches = (menus ?? []).filter((m) => menuSlugForItem(m, menus) === slug);
  return matches.find((m) => isLeaf(menus, m)) ?? matches[0] ?? null;
}

// Exact menu_name match (case-insensitive). "Parent > Menu" pins a name that
// appears under more than one parent (e.g. "Corporate > Address Type").
export function findMenuByName(menus, name) {
  const [parent, menu] = String(name ?? "").includes(">") ? String(name).split(">").map((s) => s.trim().toLowerCase()) : [null, String(name ?? "").trim().toLowerCase()];
  const matches = (menus ?? []).filter(
    (m) => String(m?.menu_name ?? "").trim().toLowerCase() === menu && (!parent || String(m?.parent_menu_name ?? "").trim().toLowerCase() === parent),
  );
  // A name can be both a leaf screen and a group elsewhere (e.g. "KYC"); the
  // leaf is the screen.
  return matches.find((m) => isLeaf(menus, m)) ?? matches[0] ?? null;
}

function buildCan(menu) {
  const can = (action) => menuHasAction(menu, action);
  can.menu = menu;
  return can;
}

// Permissions for the page the user is on. `fallbackMenuName` is only used
// when the URL isn't a sidebar menu slug (e.g. a legacy alias route).
export function usePagePermission(fallbackMenuName) {
  const menus = useSelector((state) => state.menu.menuArray);
  const { pathname } = useLocation();
  const menu = useMemo(
    () => findMenuForPath(menus, pathname) ?? (fallbackMenuName ? findMenuByName(menus, fallbackMenuName) : null),
    [menus, pathname, fallbackMenuName],
  );
  return useMemo(() => buildCan(menu), [menu]);
}

// Permissions for a specific menu by exact name — for a screen that also
// shows a second menu's data (Onboarding Wizard's Corporate tab is menu
// "Corporate Onboarding Wizard", separate from "Onboarding Wizard").
export function useMenuPermission(menuName) {
  const menus = useSelector((state) => state.menu.menuArray);
  const menu = useMemo(() => findMenuByName(menus, menuName), [menus, menuName]);
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
