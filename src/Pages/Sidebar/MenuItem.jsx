import { createElement, useState } from "react";
import { ChevronRight, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSetup, needText } from "@/Hooks/useSetup";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/Utils/Lib/utils";
import { buildMenuPathForItem } from "@/Components/Layout/Menu/menuRouteMap";
import { getChildMenuItems } from "./menuSearchUtils";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { getMenuIcon } from "@/Components/Layout/Menu/moduleIcons";
import { useMenuBadge } from "./menuBadges";
import { menuLabel } from "@/Components/Layout/Menu/menuLabels";

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

// Submenus open by easing their height to the content's (no max-height cap
// to jerk against), and the children slide in one after another.
const EASE = [0.22, 1, 0.36, 1];
const groupMotion = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1, transition: { height: { duration: 0.28, ease: EASE }, opacity: { duration: 0.2 }, when: "beforeChildren", staggerChildren: 0.025 } },
  exit: { height: 0, opacity: 0, transition: { height: { duration: 0.22, ease: EASE }, opacity: { duration: 0.12 } } },
};
const childMotion = { initial: { opacity: 0, x: -6 }, animate: { opacity: 1, x: 0, transition: { duration: 0.18, ease: EASE } } };

// Whether the active leaf lives anywhere under this node — used to force a
// group open even when its own `manuallyExpanded` state was just reset (see
// the comment on the children block below for why that happens on a rail
// collapse/expand). Recurses through the same getChildMenuItems lookup used
// everywhere else in this file.
// Every leaf under a group (for its lock: shown only when all are locked).
function leavesOf(menuItems, parentId) {
  return getChildMenuItems(menuItems, parentId).flatMap((child) => {
    const below = leavesOf(menuItems, child.menu_id);
    return below.length ? below : [child];
  });
}

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
  const badge = useMenuBadge(item?.menu_name);
  const { t } = useTranslation("setup");
  const setup = useSetup();
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
  // The setup state (Admin_33 B4): a lock (still clickable), a to-do dot,
  // "Next" on the module's next guide step. A group locks only when every
  // item under it is locked.
  const setupMenu = setup.menuOf(item?.menu_id);
  const locked = hasChildren
    ? (() => {
        const leaves = leavesOf(menuItems, item?.menu_id);
        return leaves.length > 0 && leaves.every((l) => setup.stateOf(l.menu_id) === "LOCKED");
      })()
    : setupMenu?.state === "LOCKED";
  const todo = !hasChildren && setupMenu?.state === "TODO";
  const isNext = todo && setup.isNext(item?.menu_id, item?.module_id);
  const lockTip = !hasChildren && locked ? t("needs", { list: (setupMenu.needs ?? []).filter((n) => n.required).map(needText).join(", ") }) : null;

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
  const isHighlighted = isExpanded || isActiveLeaf;
  // A solid filled pill means "this is a module" — reserved for depth 0.
  // A child (any depth > 0), even Onboarding Configuration/Wizard sitting
  // right alongside plain masters like Kinship under the same parent, gets
  // a lighter left-accent treatment instead: real nesting is shown by the
  // tree line + indent in the children wrapper below, and the active state
  // never looks like "another root module" no matter how deep it is.
  // The open page's light pill is one shared element that glides from the
  // last page's row to this one (layoutId) instead of blinking across.
  const highlightClasses = isHighlighted
    ? isRoot
      ? "bg-[var(--primary)] text-primary-foreground shadow-sm"
      : cn("text-[var(--primary)] font-semibold", !isActiveLeaf && "bg-[var(--primary-light)]")
    : "text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--primary-light)]";

  return (
    <div className="flex flex-col gap-1">
      <UiTooltip label={lockTip ? `${menuLabel(item)} · ${lockTip}` : menuLabel(item)}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "relative flex items-center justify-between gap-2 rounded-lg text-left outline-none transition-[color,background-color,transform] duration-200",
          !isRoot && !isHighlighted && !isCollapsed && "hover:translate-x-0.5",
          isRoot ? "h-10 px-2.5 text-xs font-bold" : "h-8 px-2.5 text-[11px] font-medium",
          isCollapsed ? "justify-center px-0 w-9 mx-auto" : "w-full",
          highlightClasses,
        )}
      >
        {isActiveLeaf && !isRoot && (
          <motion.span layoutId="sidebar-active-page" className="absolute inset-0 rounded-lg bg-[var(--primary-light)]" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
        )}
        <span className="relative flex min-w-0 items-center gap-1.5">
          {!isCollapsed && hasChildren && (
            <motion.span className="shrink-0" animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2, ease: EASE }}>
              <ChevronRight size={13} />
            </motion.span>
          )}
          {createElement(getMenuIcon(item?.menu_name), {
            size: isRoot ? 14 : 12,
            strokeWidth: 1.8,
            className: "shrink-0",
          })}
          {!isCollapsed && <span className={cn("truncate", locked && !isHighlighted && "opacity-60")}>{menuLabel(item)}</span>}
          {!isCollapsed && locked && <Lock size={10} className="shrink-0 opacity-60" aria-label={t("locked")} />}
          {!isCollapsed && todo && !isNext && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" aria-label={t("todo")} />}
          {!isCollapsed && isNext && <span className="shrink-0 rounded-full bg-[var(--primary)] px-1.5 text-[9px] font-bold leading-4 text-primary-foreground">{t("nextTag")}</span>}
        </span>
        {badge > 0 &&
          (isCollapsed ? (
            <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-amber-500" aria-label={String(badge)} />
          ) : (
            <span className="relative ml-auto shrink-0 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold leading-4 text-white">{badge > 99 ? "99+" : badge}</span>
          ))}
      </button>
      </UiTooltip>

      <AnimatePresence initial={false}>
      {hasChildren && !isCollapsed && isExpanded && (
        <motion.div className="overflow-hidden" variants={groupMotion} initial="initial" animate="animate" exit="exit">
          {/* The tree guide line + indent is what actually shows nesting —
              every level adds its own line/indent recursively, so depth is
              legible at a glance instead of relying on a ~12px margin that
              disappears in a long flat list. */}
          <div className="ml-[0.95rem] flex flex-col gap-1 border-l pl-2" style={{ borderColor: "var(--border)" }}>
            {children.map((child) => (
              <motion.div key={child.menu_id} variants={childMotion}>
              <MenuItem
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
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
