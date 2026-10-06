import { createElement, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { ChevronsUpDown, Check, LayoutGrid, Search } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
import { getModuleIcon } from "./moduleIcons";
import { UiTooltip } from "@/Components/Common/UiTooltip";

// The module switcher: one card that shows the module in use (or "Select
// module" before one is picked) and opens the list of the user's modules
// (already filtered to their allowed module_id values — see DynamicSidebar).
// The list floats over the sidebar, so opening it never pushes anything
// around; it gets a search box once there are more than a handful.
const SEARCH_FROM = 7;

export function ModuleDropdown({ modules, selectedModule, onSelectModule, isCollapsed }) {
  const { t } = useTranslation("sidebar");
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const list = modules || [];
  const needle = query.trim().toLowerCase();
  const shown = needle ? list.filter((m) => String(m.module_name ?? "").toLowerCase().includes(needle)) : list;

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const currentIcon = selectedModule ? getModuleIcon(selectedModule.module_name) : LayoutGrid;
  const toggle = () => {
    setQuery("");
    setIsOpen((open) => !open);
  };

  return (
    <div className="relative px-2" ref={containerRef}>
      <UiTooltip label={isCollapsed ? (selectedModule?.module_name ?? t("selectModule")) : null} side="right">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          className={cn(
            "group flex items-center gap-2.5 rounded-xl border text-left transition-all duration-200",
            isCollapsed ? "mx-auto h-10 w-10 justify-center border-transparent bg-[var(--primary)] text-white" : "h-12 w-full px-2",
            !isCollapsed && (isOpen ? "border-[var(--primary)] bg-[var(--primary-light)]" : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]"),
          )}
          style={isCollapsed ? { boxShadow: "0 4px 10px var(--primary-light)" } : undefined}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg",
              isCollapsed ? "h-10 w-10" : "h-8 w-8 bg-[var(--primary)] text-white shadow-sm",
            )}
          >
            {createElement(currentIcon, { size: 15, strokeWidth: 1.9 })}
          </span>
          {!isCollapsed && (
            <>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {selectedModule ? t("switchModule") : t("selectModule")}
                </span>
                <span className="block truncate text-[13px] font-bold text-foreground">
                  {selectedModule?.module_name ?? t("pickModuleHint")}
                </span>
              </span>
              <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground transition-colors group-hover:text-[var(--primary)]" />
            </>
          )}
        </button>
      </UiTooltip>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute top-full z-50 mt-2 flex max-h-[70vh] flex-col overflow-hidden rounded-xl border",
              isCollapsed ? "left-2 w-60" : "left-2 right-2",
            )}
            style={{ background: "var(--popover)", borderColor: "var(--border)", boxShadow: "var(--glass-shadow)" }}
          >
            {list.length >= SEARCH_FROM && (
              <label className="flex shrink-0 items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
                <Search size={13} className="text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchModules")}
                  className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                />
              </label>
            )}
            <div className="thin-scrollbar flex flex-col gap-0.5 overflow-y-auto p-1.5">
              {shown.map((moduleItem) => {
                const Icon = getModuleIcon(moduleItem.module_name);
                const isActive = selectedModule?.module_id === moduleItem.module_id;
                return (
                  <button
                    key={moduleItem.module_id}
                    type="button"
                    title={moduleItem.module_name}
                    onClick={() => {
                      onSelectModule(moduleItem);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left text-xs font-semibold transition-colors",
                      isActive ? "bg-[var(--primary-light)] text-[var(--primary)]" : "text-slate-600 hover:bg-[var(--primary-light)] hover:text-[var(--primary)]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                        isActive ? "bg-[var(--primary)] text-white" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon size={13} strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{moduleItem.module_name}</span>
                    {isActive && <Check size={13} className="shrink-0" />}
                  </button>
                );
              })}
              {shown.length === 0 && <p className="px-3 py-2 text-[11px] text-muted-foreground">{t("noModulesAvailable")}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
