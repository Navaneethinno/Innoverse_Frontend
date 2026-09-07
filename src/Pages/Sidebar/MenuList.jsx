import { useMemo, useState } from "react";
import { MenuItem } from "./MenuItem";
import { getRootMenuItems } from "./menuSearchUtils";

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
  navigate,
  isCollapsed,
  searchQuery = "",
  autoExpandedMenuIds,
  isSearching = false,
}) {
  const [activeMenuId, setActiveMenuId] = useState(null);

  const sortedRootMenus = useMemo(() => getRootMenuItems(menuItems), [menuItems]);

  if (sortedRootMenus.length === 0) {
    if (searchQuery) {
      return (
        <div className="mx-2 mt-3 rounded-lg border border-slate-200 bg-white/70 px-3 py-4 text-center">
          <p className="text-xs font-semibold text-slate-600">No menus found</p>
          <p className="mt-1 text-[11px] text-slate-400">Try a different keyword.</p>
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
