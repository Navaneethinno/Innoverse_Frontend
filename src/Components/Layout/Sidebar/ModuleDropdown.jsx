import { useState } from "react";
import { ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// Ported from payseFrontend src/Pages/Sidebar/ModuleDropdown.jsx: renders
// only the modules the caller passes in (already filtered to the user's
// allowed module_id values — see Sidebar.jsx). Selecting a module here only
// changes which menu tree is shown; per Phase 24C spec it never fabricates
// a navigation route from the module name.
export function ModuleDropdown({ modules, selectedModule, onSelectModule, isCollapsed }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1 px-2">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex items-center gap-2.5 rounded-xl h-10 text-xs font-bold text-white transition-colors bg-gradient-to-r from-[#6C7FFF] to-[#B39DFA] shadow-md shadow-indigo-200/50",
          isCollapsed ? "justify-center w-10 mx-auto px-0" : "px-3 w-full justify-between",
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <LayoutGrid size={15} strokeWidth={1.8} className="shrink-0" />
          {!isCollapsed && (
            <span className="truncate">{selectedModule?.module_name || "Select module"}</span>
          )}
        </span>
        {!isCollapsed && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out flex flex-col gap-1",
          isOpen ? "max-h-[999px] opacity-100 mt-1" : "max-h-0 opacity-0",
        )}
      >
        {(modules || []).map((moduleItem) => (
          <button
            key={moduleItem.module_id}
            type="button"
            title={moduleItem.module_name}
            onClick={() => {
              onSelectModule(moduleItem);
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center rounded-lg h-9 text-xs font-semibold truncate transition-colors",
              isCollapsed ? "justify-center w-9 mx-auto px-0" : "px-3 w-full text-left",
              selectedModule?.module_id === moduleItem.module_id
                ? "bg-indigo-100 text-indigo-700"
                : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/80",
            )}
          >
            {!isCollapsed ? moduleItem.module_name : moduleItem.module_name?.[0]}
          </button>
        ))}
        {(modules || []).length === 0 && !isCollapsed && (
          <p className="px-3 py-2 text-[11px] text-slate-400">No modules available</p>
        )}
      </div>
    </div>
  );
}
