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
export function buildMenuPath(menuName) {
  const slug = slugifyMenuName(menuName);
  const uniqueId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return `/${slug}/${uniqueId}`;
}
