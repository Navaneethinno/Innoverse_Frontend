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
import { filterSidebarMenus } from "./menuSearchUtils";

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

  const [selectedModule, setSelectedModule] = useState(null);
  const [menuSearch, setMenuSearch] = useState("");
  const searchInputRef = useRef(null);

  // Only active menus are ever considered for navigation/hierarchy — a
  // menu's own status (not its actions[] status) gates visibility.
  const activeMenuArray = useMemo(
    () => (menuArray || []).filter((item) => item?.status === 1),
    [menuArray],
  );

  const allowedModuleIds = useMemo(
    () => [...new Set(activeMenuArray.map((item) => item.module_id))],
    [activeMenuArray],
  );

  const filteredModules = useMemo(
    () => (masterModules || []).filter((module) => allowedModuleIds.includes(module.module_id)),
    [masterModules, allowedModuleIds],
  );

  // Default to the first allowed module once modules/menu data arrive.
  useEffect(() => {
    if (!selectedModule && filteredModules.length > 0) {
      setSelectedModule(filteredModules[0]);
    }
  }, [filteredModules, selectedModule]);

  const menuItemsForModule = useMemo(
    () =>
      selectedModule
        ? activeMenuArray.filter((item) => item.module_id === selectedModule.module_id)
        : [],
    [activeMenuArray, selectedModule],
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
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.90)",
        boxShadow: "0 8px 32px rgba(108,127,255,0.10), 0 1px 3px rgba(108,127,255,0.06)",
      }}
    >
      <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <ModuleDropdown
          modules={filteredModules}
          selectedModule={selectedModule}
          onSelectModule={setSelectedModule}
          isCollapsed={collapsed}
        />
        <SidebarSearch
          ref={searchInputRef}
          value={menuSearch}
          onChange={setMenuSearch}
          onClear={clearSearch}
          isCollapsed={collapsed}
        />
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
        <div className="h-px bg-gradient-to-r from-transparent via-indigo-100 to-transparent mb-3" />
        <motion.button
          onClick={toggle}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-2.5 rounded-xl h-9 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 transition-colors",
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
