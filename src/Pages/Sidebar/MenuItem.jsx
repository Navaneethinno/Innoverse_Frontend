import { createElement, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
import { buildMenuPath } from "./menuRouteMap";
import { getChildMenuItems } from "./menuSearchUtils";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { getMenuIcon } from "./moduleIcons";

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
      <UiTooltip label={item?.menu_name}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg text-left outline-none transition-colors",
          isRoot ? "h-10 px-2.5 text-xs font-bold" : "h-9 px-2.5 text-xs font-medium",
          isCollapsed
            ? "justify-center px-0 w-9 mx-auto"
            : depth > 0
              ? "ml-3 w-[calc(100%-0.75rem)]"
              : "w-full",
          isExpanded || isActiveLeaf
            ? "bg-[#2266EE] text-white shadow-sm"
            : "text-slate-500 hover:text-blue-600 hover:bg-blue-50/80",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {!isCollapsed && hasChildren && (
            <span className="shrink-0">
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
          )}
          {createElement(getMenuIcon(item?.menu_name), {
            size: 14,
            strokeWidth: 1.8,
            className: "shrink-0",
          })}
          {!isCollapsed && <span className="truncate">{item?.menu_name}</span>}
        </span>
      </button>
      </UiTooltip>

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
