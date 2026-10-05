import { useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { MenuItem } from "./MenuItem";
import { getRootMenuItems } from "./menuSearchUtils";
import { useTranslation } from "react-i18next";

// Ported from payseFrontend src/Pages/Sidebar/MenuList.jsx: root menus are
// parent_menu_id === 0, sorted by backend priority (never alphabetically).
// Root detection is delegated to menuSearchUtils' getRootMenuItems, which
// also treats an item as a root when its declared parent isn't present in
// the same list (e.g. the true parent belongs to a different module_id
// slice, or ids arrive as numeric strings). Previously this filtered with a
// bare `parent_menu_id === 0` strict-equality check, which silently found
// nothing whenever ids didn't literally match — while the search codepath's
// own orphan-promotion fallback tolerated it, making the sidebar appear to
// depend on typing a search query. Sharing one root-detection function for
// both paths removes that discrepancy.
export function MenuList({
  menuItems,
  routeMenuId = null,
  navigate,
  isCollapsed,
  searchQuery = "",
  autoExpandedMenuIds,
  isSearching = false,
}) {
  const { t } = useTranslation();
  const [clickedMenuId, setActiveMenuId] = useState(null);
  // A click's highlight lasts until the URL changes (a module dashboard
  // has no menu, so nothing stays open there).
  const { pathname } = useLocation();
  const [clickedAt, setClickedAt] = useState(pathname);
  if (pathname !== clickedAt) {
    setClickedAt(pathname);
    setActiveMenuId(null);
  }
  // The page in the URL wins; a click highlights until the route catches up.
  const activeMenuId = routeMenuId ?? clickedMenuId;

  const sortedRootMenus = useMemo(() => getRootMenuItems(menuItems), [menuItems]);

  if (sortedRootMenus.length === 0) {
    if (searchQuery) {
      return (
        <div className="mx-2 mt-3 rounded-lg border border-border bg-white/70 px-3 py-4 text-center">
          <p className="text-xs font-semibold text-slate-600">{t("sidebar:noMenusFound")}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("sidebar:tryADifferentKeyword")}</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      {sortedRootMenus.map((item) => (
        <MenuItem
          key={item.menu_id}
          item={item}
          menuItems={menuItems}
          navigate={navigate}
          isCollapsed={isCollapsed}
          autoExpandedMenuIds={autoExpandedMenuIds}
          isSearching={isSearching}
          activeMenuId={activeMenuId}
          onNavigate={setActiveMenuId}
        />
      ))}
    </div>
  );
}
