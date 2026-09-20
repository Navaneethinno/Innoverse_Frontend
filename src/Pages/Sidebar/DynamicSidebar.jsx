import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/Utils/Lib/utils";
import { useSidebar } from "@/Components/Layout/SidebarContext";
import { useIsMobile } from "@/Hooks/useIsMobile";
import { useAuth } from "@/Hooks/useAuth";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { useMasterModules } from "@/Hooks/Sidebar/useMasterModules";
import { ModuleDropdown } from "./ModuleDropdown";
import { getModuleIcon } from "./moduleIcons";
import { SidebarSearch } from "./SidebarSearch";
import { MenuList } from "./MenuList";
import { filterSidebarMenus, findOrphanedMenuItems } from "./menuSearchUtils";
import { withSupplementalMenus } from "./supplementalMenus";

const SIDEBAR_EXPANDED_W = 256;
const SIDEBAR_COLLAPSED_W = 56;

// Replicates the senior payseFrontend sidebar data flow (see
// payseFrontend/src/Pages/Sidebar/Sidebar.jsx):
//   authenticated user's menu_array (login response, Redux `menu.menuArray`)
//     -> unique module_id values = allowedModuleIds
//     -> Master module reference list (Redux `menu.masterModules`, from
//        POST /master/module/list) filtered down to allowedModuleIds
//     -> user selects a module
//     -> menu_array filtered by menu.module_id === selectedModuleId
//     -> parent/child/sub-child hierarchy built from menu_id/parent_menu_id
//        (MenuList/MenuItem), sorted by backend priority, status===1 only.
export function DynamicSidebar() {
  const { t } = useTranslation("sidebar");
  const navigate = useNavigate();
  const { collapsed, hovering, setHovering, toggle, mobileOpen, closeMobile } = useSidebar();
  const logout = useAuth((state) => state.logout);
  const isMobile = useIsMobile();
  // `hovering` lives in SidebarContext (not local state) so AppLayout can
  // reflow the page's reserved margin in sync with the same "is it visually
  // expanded" value — see SidebarContext.jsx for why an overlay-only
  // approach looked broken. On mobile the rail is never hover/collapse
  // driven — it's either fully open (a drawer, always at full width so its
  // labels are readable) or fully off-canvas.
  const isExpanded = isMobile || !collapsed || hovering;
  const sidebarWidth = isExpanded ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W;
  // Closes the mobile drawer after any leaf navigation, without touching
  // MenuItem.jsx's own navigation logic — it already calls this `navigate`
  // prop, this just also closes the drawer on mobile so picking a menu item
  // doesn't leave the overlay covering the page it just navigated to.
  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) closeMobile();
  };

  const backendMenuArray = useSelector((store) => store.menu.menuArray);
  const menuArray = useMemo(() => withSupplementalMenus(backendMenuArray), [backendMenuArray]);
  const { masterModules } = useMasterModules();

  // The selected module is tracked by id, sourced from the user's own
  // menu_array (allowedModuleIds below) — NOT from whether the master
  // module list happens to have loaded. /master/module/list only supplies
  // display metadata (module_name/icon) for the dropdown; it must never gate
  // whether the permitted menu tree itself renders once a module IS picked.
  //
  // No default/auto-selected module: matches payseFrontend's own Sidebar.jsx
  // exactly (`useState("Modules")` / empty menuItems, populated only by
  // handleModuleClick — payse never auto-picks a module on mount either).
  // All the user's permitted modules render in the dropdown up front; the
  // permitted menu tree for one of them appears only once the user clicks
  // it, same as the reference.
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [menuSearch, setMenuSearch] = useState("");
  const searchInputRef = useRef(null);

  // Only active menus are ever considered for navigation/hierarchy — a
  // menu's own status (not its actions[] status) gates visibility.
  const activeMenuArray = useMemo(
    () => (menuArray || []).filter((item) => item?.status === 1),
    [menuArray],
  );

  // Dev-time diagnostic only: a menu whose parent_menu_id points at nothing
  // in the payload is a malformed menu_array from the backend, not something
  // the frontend should paper over by inventing a root for it. Log so it's
  // visible during verification instead of silently vanishing from the tree.
  useEffect(() => {
    const orphans = findOrphanedMenuItems(activeMenuArray);
    if (orphans.length > 0) {
      console.warn(
        "[Sidebar] menu_array contains menu(s) with a parent_menu_id that " +
          "matches no other menu_id and is not 0 — these will NOT be shown " +
          "(no root is fabricated for them). Backend data to investigate:",
        orphans.map((item) => ({
          menu_id: item.menu_id,
          parent_menu_id: item.parent_menu_id,
          module_id: item.module_id,
          menu_name: item.menu_name,
        })),
      );
    }
  }, [activeMenuArray]);

  // module_id is compared as a Number on both sides (menu_array vs master
  // module list) because the two responses are not guaranteed to send it as
  // the same type — a numeric-string/number mismatch here would silently
  // empty menuItemsForModule while the sidebar's non-search codepath had no
  // fallback, which was the same class of bug fixed in menuSearchUtils'
  // getRootMenuItems (see that file for the fuller explanation).
  const allowedModuleIds = useMemo(
    () => [...new Set(activeMenuArray.map((item) => Number(item.module_id)))],
    [activeMenuArray],
  );

  const filteredModules = useMemo(
    () =>
      (masterModules || []).filter((module) => allowedModuleIds.includes(Number(module.module_id))),
    [masterModules, allowedModuleIds],
  );

  // Display object for the dropdown: prefer the real master module record
  // (name/icon) when available, otherwise fall back to a bare id-only stand-in
  // so the dropdown still reflects a selection even if /master/module/list
  // failed or hasn't returned yet.
  const selectedModule = useMemo(() => {
    if (selectedModuleId == null) return null;
    return (
      filteredModules.find((module) => Number(module.module_id) === selectedModuleId) ?? {
        module_id: selectedModuleId,
        module_name: t("moduleFallbackName", { id: selectedModuleId }),
      }
    );
  }, [filteredModules, selectedModuleId]);

  const menuItemsForModule = useMemo(
    () =>
      selectedModuleId == null
        ? []
        : activeMenuArray.filter((item) => Number(item.module_id) === selectedModuleId),
    [activeMenuArray, selectedModuleId],
  );

  const trimmedSearch = menuSearch.trim();
  const searchableMenuItems = trimmedSearch ? activeMenuArray : menuItemsForModule;

  const {
    filteredItems: filteredMenuItems,
    expandedMenuIds: searchExpandedMenuIds,
    isSearching,
  } = useMemo(
    () => filterSidebarMenus(searchableMenuItems, menuSearch),
    [searchableMenuItems, menuSearch],
  );

  const focusSearch = useCallback(() => searchInputRef.current?.focus(), []);
  const clearSearch = useCallback(() => {
    setMenuSearch("");
    focusSearch();
  }, [focusSearch]);

  // SidebarSearch unmounts entirely while the rail is collapsed (isExpanded
  // false), so searchInputRef is null and focusSearch() is a no-op until
  // something expands the rail first. Ctrl/Cmd+K needs to work even then —
  // it force-expands via `hovering` (the same state the mouse-hover
  // expansion already uses) and defers the focus call to the effect below,
  // which fires once isExpanded flips true and the input has actually
  // mounted.
  const pendingFocusRef = useRef(false);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!isExpanded) {
          pendingFocusRef.current = true;
          setHovering(true);
        } else {
          focusSearch();
        }
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [focusSearch, isExpanded, setHovering]);

  useEffect(() => {
    if (isExpanded && pendingFocusRef.current) {
      pendingFocusRef.current = false;
      // Wait a tick for SidebarSearch's input to mount/animate in before
      // focusing it.
      const id = requestAnimationFrame(() => focusSearch());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [isExpanded, focusSearch]);

  return (
    <>
      {/* Backdrop — mobile only, only while the drawer is open. Click
          anywhere on it to close, same as tapping outside any other
          overlay in the app. */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeMobile}
            className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          />
        )}
      </AnimatePresence>
      <motion.aside
        onMouseEnter={() => !isMobile && setHovering(true)}
        onMouseLeave={() => !isMobile && setHovering(false)}
        animate={
          isMobile
            ? { x: mobileOpen ? 0 : "-110%", width: sidebarWidth }
            : { x: 0, width: sidebarWidth }
        }
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "flex flex-col py-3 rounded-2xl overflow-hidden",
          // Desktop: a persistent rail, always in view. Mobile: a
          // full-height off-canvas drawer above the backdrop, translated
          // fully off-screen (via the `animate` x above) until opened.
          isMobile ? "fixed left-3 top-3 bottom-3 z-50" : "fixed left-3 top-3 bottom-3 z-30",
        )}
        style={{
          // Same "frosted glass with color bleeding through it" treatment as
          // TopBar.jsx: a soft brand-color gradient layered on top of the
          // existing translucent panel, richer blur+saturation underneath.
          background: "var(--glass-gradient), var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
          // Belt-and-braces against a horizontal scrollbar ever appearing in
          // the narrow collapsed rail: framer-motion animates `width` via an
          // inline style, and during that animation (or while `isExpanded`
          // is momentarily out of sync with `sidebarWidth`) a child's
          // intrinsic min-content width can briefly exceed the rail's
          // current width. `overflow-hidden` on this element already clips
          // that, but an explicit inline overflowX guarantees no browser
          // ever reserves scrollbar space for it regardless of class order.
          overflowX: "hidden",
        }}
      >
      {isMobile && (
        <div className="mb-1 flex shrink-0 items-center justify-between px-2">
          <span className="text-xs font-bold text-foreground">{t("common:menu", "Menu")}</span>
          <button
            type="button"
            onClick={closeMobile}
            aria-label={t("common:close", "Close")}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {/* Pinned: the global search bar and the "Select module" control
          never move and never disappear, regardless of whether a module
          is selected, the module list is open, or the menu tree below
          scrolls/grows. */}
      <div className="shrink-0 flex flex-col gap-3">
        <SidebarSearch
          ref={searchInputRef}
          value={menuSearch}
          onChange={setMenuSearch}
          onClear={clearSearch}
          isCollapsed={!isExpanded}
        />
        <ModuleDropdown
          modules={filteredModules}
          selectedModule={selectedModule}
          onSelectModule={(module) => setSelectedModuleId(Number(module.module_id))}
          isCollapsed={!isExpanded}
        />
      </div>

      <div
        className="thin-scrollbar mt-3 flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto"
        style={{ overflowX: "hidden" }}
      >
        {selectedModule &&
          (() => {
            const SelectedIcon = getModuleIcon(selectedModule.module_name);
            return (
              <div className="px-2 min-w-0">
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg h-10 text-xs font-semibold bg-primary-light text-primary min-w-0",
                    isExpanded ? "px-3.5 w-full" : "justify-center w-10 mx-auto px-0",
                  )}
                >
                  <SelectedIcon size={15} strokeWidth={1.8} className="shrink-0 text-primary" />
                  {isExpanded && <span className="truncate">{selectedModule.module_name}</span>}
                </div>
              </div>
            );
          })()}
        <div className="px-2 min-w-0">
          <MenuList
            menuItems={filteredMenuItems}
            navigate={handleNavigate}
            isCollapsed={!isExpanded}
            searchQuery={trimmedSearch}
            autoExpandedMenuIds={searchExpandedMenuIds}
            isSearching={isSearching}
          />
        </div>
      </div>

      <div className="px-2 mt-2">
        <div
          className="h-px mb-3"
          style={{ background: "linear-gradient(to right, transparent, var(--primary-light), transparent)" }}
        />
        <UiTooltip label="Sign out" side="right">
          <motion.button
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label={t("common:signOut")}
            className={cn(
              "mb-2 flex items-center gap-2.5 rounded-xl h-9 text-red-500 hover:text-red-600 hover:bg-red-50/80 transition-colors",
              isExpanded ? "px-3 w-full" : "justify-center w-10 mx-auto px-0",
            )}
          >
            <LogOut size={15} strokeWidth={1.8} />
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs font-semibold whitespace-nowrap overflow-hidden"
                >
                  {t("common:signOut")}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </UiTooltip>
        {/* Collapse/pin-open only makes sense for the desktop rail — the
            mobile drawer is always full-width while open, closed via the
            X above or the backdrop otherwise. */}
        {!isMobile && (
          <motion.button
            onClick={toggle}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            className={cn(
              "flex items-center gap-2.5 rounded-xl h-9 text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors",
              isExpanded ? "px-3 w-full" : "justify-center w-10 mx-auto px-0",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen size={15} strokeWidth={1.8} />
            ) : (
              <PanelLeftClose size={15} strokeWidth={1.8} />
            )}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs font-semibold whitespace-nowrap overflow-hidden"
                >
                  {collapsed ? t("pinOpen") : t("collapse")}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </div>
      </motion.aside>
    </>
  );
}

export const SIDEBAR_WIDTHS = { expanded: SIDEBAR_EXPANDED_W, collapsed: SIDEBAR_COLLAPSED_W };
