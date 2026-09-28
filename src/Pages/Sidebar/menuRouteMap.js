// Route-fabrication convention ported verbatim from payseFrontend
// (src/Pages/Sidebar/MenuItem.jsx `handleNavigation`): the menu_name is
// slugged into a path segment and navigated to directly, without checking
// whether a page is registered for it. payse relies on its "/body" route
// group's errorElement (Components/Error.jsx) to catch any slug that has no
// matching route; Innoverse's protected route group has the same mechanism
// (errorElement: <RouteError />), so an unmapped backend menu shows the app's
// error/not-found screen instead of a blank page or a silently-inert click.
export function slugifyMenuName(menuName) {
  return String(menuName ?? "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

// Menu names repeat — Onboarding Master/Configuration/Wizard under both
// Individual and Corporate, and every EPURSE menu copied into MMS — so the
// sidebar routes by module + full menu path (Menus handoff 12):
// EPURSE > Onboarding > Corporate > Onboarding Wizard ->
// /epurse/onboarding/corporate/onboarding-wizard. MenuPage resolves the
// path back to its menu. A per-click nonce in history state remounts the
// page when the same menu is clicked again.
export function buildMenuPathForItem(item, menuItems) {
  return menuPathForItem(item, menuItems);
}

export const kebab = (text) =>
  String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const byId = (menuItems, id) => menuItems?.find((m) => String(m?.menu_id) === String(id));

// The menu and its ancestors, top-level first.
export function menuChain(item, menuItems) {
  const chain = [];
  const seen = new Set();
  for (let m = item; m && !seen.has(String(m.menu_id)); m = byId(menuItems, m.parent_menu_id)) {
    seen.add(String(m.menu_id));
    chain.unshift(m);
  }
  return chain;
}

export function menuPathForItem(item, menuItems) {
  const segments = [item?.module_name, ...menuChain(item, menuItems).map((m) => m.menu_name)].map(kebab).filter(Boolean);
  return `/${segments.join("/")}`;
}

// The menu a /<module>/<menu>/<...> path names, or null.
export function findMenuByPath(menuItems, pathname) {
  const target = `/${String(pathname ?? "").split("/").filter(Boolean).map((s) => decodeURIComponent(s).toLowerCase()).join("/")}`;
  return (menuItems ?? []).find((m) => menuPathForItem(m, menuItems) === target) ?? null;
}

// "individual" / "corporate" when the menu sits under an Individual or
// Corporate branch (the nearest one up the chain), else null.
export function menuBranch(item, menuItems) {
  const branch = menuChain(item, menuItems)
    .reverse()
    .slice(1)
    .find((m) => ["individual", "corporate"].includes(kebab(m.menu_name)));
  return branch ? kebab(branch.menu_name) : null;
}

// Menu names known to collide with an unrelated menu elsewhere in the tree;
// only these get their parent's name folded into the slug.
const DISAMBIGUATE_BY_PARENT = new Set(["Profile"]);

// The page registry key for a menu: the legacy one-segment slug its page is
// registered under (routes by menu name). Menus under a Corporate branch
// get "corp" in front (Address Type -> corpaddresstype) so they don't open
// Individual's page; the reorganized Corporate Onboarding Configuration /
// Wizard open their corporate pages. usePagePermission also reverses this
// for the legacy one-segment URLs.
const CORPORATE_PAGES = {
  onboardingconfiguration: "corporateonboardingconfiguration",
  onboardingwizard: "corporateonboardingwizard",
};

export function menuSlugForItem(item, menuItems) {
  const parent = byId(menuItems, item?.parent_menu_id);
  const parentName = String(parent?.menu_name ?? "").trim();
  const slug = slugifyMenuName(item?.menu_name);
  if (menuBranch(item, menuItems) === "corporate") return CORPORATE_PAGES[slug] ?? `corp${slug}`;
  if (parentName && DISAMBIGUATE_BY_PARENT.has(String(item?.menu_name ?? "").trim())) {
    return slugifyMenuName(`${parentName} ${item?.menu_name}`);
  }
  return slug;
}
