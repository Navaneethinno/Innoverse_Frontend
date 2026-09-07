import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
import { buildMenuPath } from "./menuRouteMap";
import { getChildMenuItems } from "./menuSearchUtils";

// Structure/behavior ported from payseFrontend src/Pages/Sidebar/MenuItem.jsx:
// arbitrary-depth parent/child/sub-child hierarchy (root: parent_menu_id===0,
// each further level: parent_menu_id === parent.menu_id), sorted by backend
// priority, expand-on-click for menus with children, navigate-on-click for
// leaf menus. Only active (status === 1) menus reach this tree — filtering
// happens once in MenuList. Actions[] are preserved on each item exactly as
// received from the login menu_array; this component does not alter them.
// Child lookup goes through menuSearchUtils' getChildMenuItems so id
// comparisons are normalized the same way as root detection (see MenuList).
function sortedChildrenOf(menuItems, parentId) {
  return getChildMenuItems(menuItems, parentId);
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
    onNavigate(item?.menu_id);
    // Matches payseFrontend's handleNavigation exactly: slugify menu_name and
    // navigate there via React Router, regardless of whether a page is
    // registered for it. Unmatched slugs surface the app's errorElement
    // (RouteError), same as payse's own "/body" errorElement does for it.
    navigate(buildMenuPath(item?.menu_name));
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
            ? "bg-[#2266EE] text-white shadow-sm"
            : "text-slate-500 hover:text-blue-600 hover:bg-blue-50/80",
        )}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {!isCollapsed && hasChildren && (
            <span className="shrink-0">
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
          )}
          {!isCollapsed && hasChildren && (
            <span className="shrink-0">
              {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
            </span>
          )}
          {!isCollapsed && <span className="truncate">{item?.menu_name}</span>}
        </span>
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
