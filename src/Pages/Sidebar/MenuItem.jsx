import { createElement, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
import { buildMenuPathForItem } from "./menuRouteMap";
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

// Whether the active leaf lives anywhere under this node — used to force a
// group open even when its own `manuallyExpanded` state was just reset (see
// the comment on the children block below for why that happens on a rail
// collapse/expand). Recurses through the same getChildMenuItems lookup used
// everywhere else in this file.
function subtreeContainsId(menuItems, parentId, targetId) {
  if (targetId == null) return false;
  return getChildMenuItems(menuItems, parentId).some(
    (child) => String(child.menu_id) === String(targetId) || subtreeContainsId(menuItems, child.menu_id, targetId),
  );
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
  // Tri-state, not a plain boolean: `null` means "no explicit click yet,
  // derive it" (auto-open for the active branch); `true`/`false` means the
  // user explicitly clicked this row open or shut, which always wins —
  // including over the active-branch auto-open below, so a group the user
  // is currently inside can still be collapsed by hand instead of being
  // stuck open forever.
  const [manualOverride, setManualOverride] = useState(null);

  const children = sortedChildrenOf(menuItems, item?.menu_id);
  const hasChildren = children.length > 0;
  // Collapsing the rail unmounts every child MenuItem at every level (see
  // the `!isCollapsed` gate below), which throws away their own expand
  // state — expanding the rail again then remounted everything closed,
  // even a group the user was actively inside. Falling back to "does the
  // active leaf live under here" re-derives that open state from
  // activeMenuId (owned by MenuList, which never unmounts) instead of
  // depending on state that just got destroyed — but only when the user
  // hasn't explicitly said otherwise (see manualOverride above).
  const containsActive = hasChildren && subtreeContainsId(menuItems, item?.menu_id, activeMenuId);
  const derivedExpanded = containsActive || (isSearching && autoExpandedMenuIds?.has(item?.menu_id));
  const isExpanded = manualOverride ?? derivedExpanded;
  const isActiveLeaf = !hasChildren && activeMenuId === item?.menu_id;

  const handleClick = () => {
    if (hasChildren) {
      setManualOverride(!isExpanded);
      return;
    }
    onNavigate(item?.menu_id);
    // /<module>/<menu path> (menuRouteMap); the nonce remounts the page when
    // the same menu is clicked again (MenuPage).
    navigate(buildMenuPathForItem(item, menuItems), { state: { menuClick: Date.now() } });
  };

  const isRoot = depth === 0;
  // Only the open page is filled (a soft pill with an accent bar); an open
  // group just turns darker, so a long tree never becomes a column of
  // coloured blocks. Nesting is shown by the guide line + indent below.
  const rowClasses = isActiveLeaf
    ? "bg-[var(--primary-light)] text-[var(--primary)] font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-[var(--primary)]"
    : isExpanded
      ? "text-foreground font-semibold"
      : "text-slate-600 hover:bg-[var(--primary-light)]/60 hover:text-[var(--primary)]";

  return (
    <div className="flex flex-col gap-1">
      <UiTooltip label={item?.menu_name}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "relative flex items-center justify-between gap-2 rounded-lg text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40",
          isRoot ? "h-9 px-2.5 text-[12.5px] font-medium" : "h-8 px-2.5 text-xs font-medium",
          isCollapsed ? "justify-center px-0 w-9 mx-auto" : "w-full",
          rowClasses,
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {createElement(getMenuIcon(item?.menu_name), {
            size: isRoot ? 15 : 13,
            strokeWidth: 1.8,
            className: cn("shrink-0", isActiveLeaf ? "text-[var(--primary)]" : "text-muted-foreground"),
          })}
          {!isCollapsed && <span className="truncate">{item?.menu_name}</span>}
        </span>
        {!isCollapsed && hasChildren && (
          <ChevronRight size={13} className={cn("shrink-0 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-90")} />
        )}
      </button>
      </UiTooltip>

      {hasChildren && !isCollapsed && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isExpanded ? "max-h-[999px] opacity-100" : "max-h-0 opacity-0",
          )}
        >
          {/* The tree guide line + indent is what actually shows nesting —
              every level adds its own line/indent recursively, so depth is
              legible at a glance instead of relying on a ~12px margin that
              disappears in a long flat list. */}
          <div className="ml-[1.05rem] mt-0.5 flex flex-col gap-0.5 border-l pl-2" style={{ borderColor: "var(--border)" }}>
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
        </div>
      )}
    </div>
  );
}
