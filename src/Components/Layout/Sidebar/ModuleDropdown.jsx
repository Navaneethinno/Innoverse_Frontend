import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
import { getModuleIcon } from "./moduleIcons";

// Ported from payseFrontend src/Pages/Sidebar/ModuleDropdown.jsx: renders
// only the modules the caller passes in (already filtered to the user's
// allowed module_id values — see Sidebar.jsx). Selecting a module here only
// changes which menu tree is shown; per Phase 24C spec it never fabricates
// a navigation route from the module name.
//
// This is the PERMANENT module-selector control — its label always reads
// "Select module" (it never gets swapped out for the currently selected
// module's name) so the user always has a visible way to switch modules.
// The list floats over the sidebar as an overlay so opening it never
// pushes the search bar, or anything else, around.
export function ModuleDropdown({ modules, selectedModule, onSelectModule, isCollapsed }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

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

  return (
    <div className="relative px-2" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex items-center gap-2.5 rounded-xl h-10 text-xs font-bold text-white transition-colors bg-[#2266EE] shadow-md shadow-blue-200/50",
          isCollapsed ? "justify-center w-10 mx-auto px-0" : "px-3 w-full justify-between",
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <LayoutGrid size={15} strokeWidth={1.8} className="shrink-0" />
          {!isCollapsed && <span className="truncate">Select module</span>}
        </span>
        {!isCollapsed && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-50 flex flex-col gap-1.5 rounded-xl border p-2 max-h-[70vh] overflow-y-auto"
          style={{
            background: "var(--popover)",
            borderColor: "var(--border)",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          {(modules || []).map((moduleItem) => {
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
                  "flex items-center gap-3 rounded-lg h-10 text-xs font-semibold truncate transition-colors",
                  isCollapsed ? "justify-center w-10 mx-auto px-0" : "px-3.5 w-full text-left",
                  isActive
                    ? "bg-primary-light text-primary"
                    : "text-muted-foreground hover:text-primary hover:bg-primary-light/60",
                )}
              >
                <Icon
                  size={15}
                  strokeWidth={1.8}
                  className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground/70")}
                />
                {!isCollapsed && <span className="truncate">{moduleItem.module_name}</span>}
              </button>
            );
          })}
          {(modules || []).length === 0 && !isCollapsed && (
            <p className="px-3.5 py-2 text-[11px] text-muted-foreground">No modules available</p>
          )}
        </div>
      )}
    </div>
  );
}
