import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { menuPage } from "@/Pages/Sidebar/menuRouteMap";
import { useMenuContext } from "@/Pages/Sidebar/menuContext";
import { matchesAction } from "@/Utils/Lib/actionAliases";

// The one permission source for every screen. Everything comes from the
// login response's menu_array: a button shows only when the user's profile
// grants that action on that exact menu. Fail-closed — a menu that isn't in
// menu_array, or an action it doesn't list, is denied. (The backend enforces
// the same rule and answers "Permission Denied" otherwise.)

function menuHasAction(menu, action) {
  return Boolean(menu) && (menu.actions ?? []).some((a) => matchesAction(a?.action_name ?? a?.name, action));
}

const isLeaf = (menus, menu) => !menus.some((m) => String(m?.parent_menu_id) === String(menu?.menu_id));

// Menu names repeat across modules (every EPURSE menu is copied into MMS).
// Among equal matches: the given module's first, then the original (lowest id).
function pick(menus, matches, module) {
  const inModule = module ? matches.filter((m) => m?.module_name === module) : [];
  const pool = inModule.length ? inModule : matches;
  const ranked = [...pool].sort((a, b) => Number(a.menu_id) - Number(b.menu_id));
  return ranked.find((m) => isLeaf(menus, m)) ?? ranked[0] ?? null;
}

// The menu a one-segment URL (/<page slug>/...) belongs to: a merged menu
// covers every page it stands for. Sidebar menus open at /<module>/<menu
// path>, where MenuPage supplies the menu itself (MenuContext).
function findMenuForPath(menus, pathname, module) {
  const slug = String(pathname ?? "").split("/").filter(Boolean)[0]?.toLowerCase();
  if (!slug) return null;
  return pick(menus, (menus ?? []).filter((m) => menuPage(m).slugs.includes(slug)), module);
}

// Exact menu_name match (case-insensitive). "Parent > Menu" pins a name that
// appears under more than one parent (e.g. "Corporate > Address Type").
export function findMenuByName(menus, name, module) {
  const [parent, menu] = String(name ?? "").includes(">") ? String(name).split(">").map((s) => s.trim().toLowerCase()) : [null, String(name ?? "").trim().toLowerCase()];
  const matches = (menus ?? []).filter(
    (m) => String(m?.menu_name ?? "").trim().toLowerCase() === menu && (!parent || String(m?.parent_menu_name ?? "").trim().toLowerCase() === parent),
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
// shows a second menu's data (Cards shows Card Requests' actions).
export function useMenuPermission(menuName) {
  const menus = useSelector((state) => state.menu.menuArray);
  const module = useMenuContext()?.module;
  const menu = useMemo(() => findMenuByName(menus, menuName, module), [menus, menuName, module]);
  return useMemo(() => buildCan(menu), [menu]);
}

// The customers / merchants menus behind the onboarding wizard: Individual
// and Corporate are separate menus, named for the module.
const PARTY_MENUS = {
  individual: { EPURSE: "Individual Customers", MMS: "Individual Merchants" },
  corporate: { EPURSE: "Corporate Customers", MMS: "Corporate Merchants" },
};
export function usePartyMenuPermission(type) {
  const module = useMenuContext()?.module;
  return useMenuPermission(PARTY_MENUS[type][module === "MMS" ? "MMS" : "EPURSE"]);
}
