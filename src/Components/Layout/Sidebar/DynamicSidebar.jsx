import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/Utils/Lib/utils";
import { useSidebar } from "../SidebarContext";
import { useMasterModules } from "@/Hooks/Sidebar/useMasterModules";
import { ModuleDropdown } from "./ModuleDropdown";
import { SidebarSearch } from "./SidebarSearch";
import { MenuList } from "./MenuList";
import { filterSidebarMenus, findOrphanedMenuItems } from "./menuSearchUtils";

const SIDEBAR_EXPANDED_W = 220;
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
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebar();
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W;

  const menuArray = useSelector((store) => store.menu.menuArray);
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
        module_name: `Module ${selectedModuleId}`,
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

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [focusSearch]);

  return (
    <motion.aside
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-3 top-3 bottom-3 z-30 flex flex-col py-3 rounded-2xl overflow-hidden"
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glass-shadow)",
      }}
    >
      {/* Pinned header: module picker + search never move, regardless of
          how long the menu list below gets or scrolls. */}
      <div className="flex flex-col gap-3 shrink-0">
        <ModuleDropdown
          modules={filteredModules}
          selectedModule={selectedModule}
          onSelectModule={(module) => setSelectedModuleId(Number(module.module_id))}
          isCollapsed={collapsed}
        />
        <SidebarSearch
          ref={searchInputRef}
          value={menuSearch}
          onChange={setMenuSearch}
          onClear={clearSearch}
          isCollapsed={collapsed}
        />
      </div>

      <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto overflow-x-hidden mt-3">
        <div className="px-2">
          <MenuList
            menuItems={filteredMenuItems}
            navigate={navigate}
            isCollapsed={collapsed}
            searchQuery={trimmedSearch}
            autoExpandedMenuIds={searchExpandedMenuIds}
            isSearching={isSearching}
          />
        </div>
      </div>

      <div className="px-2 mt-2">
        <div className="h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent mb-3" />
        <motion.button
          onClick={toggle}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-2.5 rounded-xl h-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50/80 transition-colors",
            collapsed ? "justify-center w-10 mx-auto px-0" : "px-3 w-full",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={15} strokeWidth={1.8} />
          ) : (
            <PanelLeftClose size={15} strokeWidth={1.8} />
          )}
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xs font-semibold whitespace-nowrap overflow-hidden"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.aside>
  );
}

export const SIDEBAR_WIDTHS = { expanded: SIDEBAR_EXPANDED_W, collapsed: SIDEBAR_COLLAPSED_W };
