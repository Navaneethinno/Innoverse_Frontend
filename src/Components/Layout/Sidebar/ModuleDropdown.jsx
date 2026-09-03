import { useState } from "react";
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
  ShieldAlert,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
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

  return (
    <div className="flex flex-col gap-1 px-2">
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

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out flex flex-col gap-1",
          isOpen ? "max-h-[999px] opacity-100 mt-1" : "max-h-0 opacity-0",
        )}
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
                className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground/70")}
              />
              {!isCollapsed && <span className="truncate">{moduleItem.module_name}</span>}
            </button>
          );
        })}
        {(modules || []).length === 0 && !isCollapsed && (
          <p className="px-3 py-2 text-[11px] text-muted-foreground">No modules available</p>
        )}
      </div>
    </div>
  );
}
