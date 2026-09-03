import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Fingerprint,
  Landmark,
  Layers,
  LayoutGrid,
  Link2,
  Lock,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

const MODULE_ICON_RULES = [
  [/purse|wallet/i, Wallet],
  [/risk/i, ShieldAlert],
  [/cms|content/i, ClipboardList],
  [/mms|merchant|store/i, Store],
  [/pay/i, CreditCard],
  [/secure|security/i, Lock],
  [/aml/i, ShieldCheck],
  [/chatbot|bot/i, Bot],
  [/fraud/i, AlertTriangle],
  [/lrms|loan|recovery/i, Landmark],
  [/recon/i, RefreshCcw],
  [/bridge/i, Link2],
  [/fleet/i, Truck],
  [/kyc|identity/i, Fingerprint],
];

function getModuleIcon(moduleName = "") {
  const match = MODULE_ICON_RULES.find(([pattern]) => pattern.test(moduleName));
  return match ? match[1] : Layers;
}

// Ported from payseFrontend src/Pages/Sidebar/ModuleDropdown.jsx: renders
// only the modules the caller passes in (already filtered to the user's
// allowed module_id values — see Sidebar.jsx). Selecting a module here only
// changes which menu tree is shown; per Phase 24C spec it never fabricates
// a navigation route from the module name.
export function ModuleDropdown({ modules, selectedModule, onSelectModule, isCollapsed }) {
  const [isOpen, setIsOpen] = useState(false);
  const [moduleSearch, setModuleSearch] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

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

  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    } else {
      setModuleSearch("");
    }
  }, [isOpen]);

  const trimmedModuleSearch = moduleSearch.trim().toLowerCase();
  const filteredModules = useMemo(() => {
    if (!trimmedModuleSearch) return modules || [];
    return (modules || []).filter((moduleItem) =>
      moduleItem.module_name?.toLowerCase().includes(trimmedModuleSearch),
    );
  }, [modules, trimmedModuleSearch]);

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
          {!isCollapsed && (
            <span className="truncate">{selectedModule?.module_name || "Select module"}</span>
          )}
        </span>
        {!isCollapsed && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
      </button>

      {isOpen && (
        <div
          className="absolute left-2 right-2 top-full mt-1.5 z-50 flex flex-col rounded-xl border overflow-hidden"
          style={{
            background: "var(--popover)",
            borderColor: "var(--border)",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          {!isCollapsed && (
            <div className="p-1.5 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Search modules..."
                  className="w-full pl-7 pr-6 py-1.5 rounded-lg text-[11px] outline-none border"
                  style={{
                    background: "var(--input-background)",
                    color: "var(--foreground)",
                    borderColor: "var(--border)",
                  }}
                />
                {moduleSearch && (
                  <button
                    type="button"
                    onClick={() => setModuleSearch("")}
                    aria-label="Clear module search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1 p-1.5 max-h-[50vh] overflow-y-auto">
            {filteredModules.map((moduleItem) => {
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
                    "flex items-center gap-2.5 rounded-lg h-9 text-xs font-semibold truncate transition-colors",
                    isCollapsed ? "justify-center w-9 mx-auto px-0" : "px-3 w-full text-left",
                    isActive
                      ? "bg-primary-light text-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-primary-light/60",
                  )}
                >
                  <Icon
                    size={14}
                    strokeWidth={1.8}
                    className={cn(
                      "shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground/70",
                    )}
                  />
                  {!isCollapsed && <span className="truncate">{moduleItem.module_name}</span>}
                </button>
              );
            })}
            {filteredModules.length === 0 && !isCollapsed && (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">
                {trimmedModuleSearch ? "No modules match your search" : "No modules available"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
