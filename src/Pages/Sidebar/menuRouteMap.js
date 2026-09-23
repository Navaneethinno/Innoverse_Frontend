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

// payse appends a fresh uuidv4 as a route param purely to force a remount
// when the same menu is clicked again; crypto.randomUUID() is the browser-
// native equivalent and avoids adding the `uuid` package as a new dependency
// for what is otherwise identical behavior.
function withUniqueId(slug) {
  const uniqueId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return `/${slug}/${uniqueId}`;
}

export function buildMenuPath(menuName) {
  return withUniqueId(slugifyMenuName(menuName));
}

// The path is built from the menu name alone, so a menu's PARENT is
// invisible to it — two menus sharing a name (Address Type under both
// Onboarding Master > Individual and > Corporate) collide on the same slug
// and open whichever page happens to be registered for it (Frontend fixes —
// onboarding menus and corporate masters, 2026-09, fix 3). Every leaf under
// a menu literally named "Corporate" gets its slug prefixed with "corp" —
// Address Type -> corpaddresstype — instead of colliding with Individual's
// own addresstype. This only fires for a DIRECT child of "Corporate"; a
// menu named "Corporate" nested deeper wouldn't currently occur in this
// menu tree, so this doesn't recurse up past the immediate parent.
export function buildMenuPathForItem(item, menuItems) {
  const parent = menuItems?.find((m) => String(m?.menu_id) === String(item?.parent_menu_id));
  const isCorporateChild = String(parent?.menu_name ?? "").trim() === "Corporate";
  const slug = isCorporateChild ? `corp${slugifyMenuName(item?.menu_name)}` : slugifyMenuName(item?.menu_name);
  return withUniqueId(slug);
}
