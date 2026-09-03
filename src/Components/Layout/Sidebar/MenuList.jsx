import { useMemo, useState } from "react";
import { MenuItem } from "./MenuItem";

// Ported from payseFrontend src/Pages/Sidebar/MenuList.jsx: root menus are
// parent_menu_id === 0, sorted by backend priority (never alphabetically).
export function MenuList({
  menuItems,
  navigate,
  isCollapsed,
  searchQuery = "",
  autoExpandedMenuIds,
  isSearching = false,
}) {
  const [activeMenuId, setActiveMenuId] = useState(null);

  const sortedRootMenus = useMemo(
    () =>
      (menuItems || [])
        .filter((item) => (item?.parent_menu_id ?? 0) === 0)
        .sort((a, b) => (a?.priority ?? 0) - (b?.priority ?? 0)),
    [menuItems],
  );

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
