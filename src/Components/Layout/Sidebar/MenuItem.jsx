import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
import { resolveImplementedRoute } from "./menuRouteMap";

// Structure/behavior ported from payseFrontend src/Pages/Sidebar/MenuItem.jsx:
// arbitrary-depth parent/child/sub-child hierarchy (root: parent_menu_id===0,
// each further level: parent_menu_id === parent.menu_id), sorted by backend
// priority, expand-on-click for menus with children, navigate-on-click for
// leaf menus. Only active (status === 1) menus reach this tree — filtering
// happens once in MenuList. Actions[] are preserved on each item exactly as
// received from the login menu_array; this component does not alter them.
function sortedChildrenOf(menuItems, parentId) {
  return (menuItems || [])
    .filter((sub) => sub?.parent_menu_id === parentId)
    .sort((a, b) => (a?.priority ?? 0) - (b?.priority ?? 0));
}

export function MenuItem({
  item,
  menuItems,
  navigate,
  isCollapsed,
  autoExpandedMenuIds,
  isSearching,
  activeMenuId,
  onNavigate,
  depth = 0,
}) {
  const [manuallyExpanded, setManuallyExpanded] = useState(false);

  const children = sortedChildrenOf(menuItems, item?.menu_id);
  const hasChildren = children.length > 0;
  const isExpanded =
    manuallyExpanded || (isSearching && autoExpandedMenuIds?.has(item?.menu_id));
  const isActiveLeaf = !hasChildren && activeMenuId === item?.menu_id;

  const handleClick = () => {
    if (hasChildren) {
      setManuallyExpanded((current) => !current);
      return;
    }
    const path = resolveImplementedRoute(item?.menu_name);
    onNavigate(item?.menu_id);
    if (path) {
      // React Router navigation only — no window.location for internal nav.
      navigate(path);
    }
    // Backend menus without an implemented page intentionally do not
    // navigate anywhere; no fabricated route is created.
  };

  const isRoot = depth === 0;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        title={item?.menu_name}
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg truncate text-left outline-none transition-colors",
          isRoot ? "h-10 px-2.5 text-xs font-bold" : "h-9 px-2.5 text-xs font-medium",
          depth > 0 ? "ml-3" : "",
          isCollapsed ? "justify-center px-0 w-9 mx-auto" : "w-full",
          isExpanded || isActiveLeaf
            ? "bg-gradient-to-r from-[#6C7FFF] to-[#B39DFA] text-white shadow-sm"
            : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/80",
        )}
      >
        {!isCollapsed && <span className="truncate">{item?.menu_name}</span>}
        {!isCollapsed && hasChildren && (
          <span className="shrink-0">
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </button>

      {hasChildren && !isCollapsed && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out flex flex-col gap-1",
            isExpanded ? "max-h-[999px] opacity-100" : "max-h-0 opacity-0",
          )}
        >
          {children.map((child) => (
            <MenuItem
              key={child.menu_id}
              item={child}
              menuItems={menuItems}
              navigate={navigate}
              isCollapsed={isCollapsed}
              autoExpandedMenuIds={autoExpandedMenuIds}
              isSearching={isSearching}
              activeMenuId={activeMenuId}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
