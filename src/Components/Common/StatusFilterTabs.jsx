import { cn } from "@/Utils/Lib/cn";
import { Search } from "lucide-react";
import { INSTITUTION_DRAFT_STATUS_CODE } from "@/Utils/Constant";

// INSTITUTION_DRAFT_STATUS_CODE is env-overridable (defaults to 9) rather
// than a bare literal, since this component is shared across every
// maker-checker list in the app (Institution sub-entities, MasterConfig,
// UserManagement, ...) and all of them use the same numeric draft code.
export const statusBucket = (row) => {
  const status = String(row?.status_name ?? row?.auth_status ?? "").toLowerCase();
  const process = String(row?.process_status_name ?? "").toLowerCase();
  if (status.includes("inactive") || process.includes("inactive")) return "inactive";
  if (status.includes("active") || status === "authorized" || row?.status === 1) return "active";
  if (
    status.includes("pending") ||
    process.includes("pending") ||
    status.includes("draft") ||
    process.includes("draft") ||
    Number(row?.status) === INSTITUTION_DRAFT_STATUS_CODE
  )
    return "pending";
  return "inactive";
};

export function StatusFilterTabs({ rows = [], value, onChange, search = "", onSearch, searchPlaceholder = "Search institutions..." }) {
  const counts = rows.reduce(
    (result, row) => {
      result.all += 1;
      result[statusBucket(row)] += 1;
      return result;
    },
    { all: 0, active: 0, pending: 0, inactive: 0 },
  );
  const tabs = [
    ["all", "All"],
    ["active", "Active"],
    ["pending", "Pending"],
    ["inactive", "Inactive"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onSearch && (
        <div className="relative mr-1 w-full max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-12 w-full rounded-full border border-slate-200 bg-white/70 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
      )}
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
            value === key
              ? "border-transparent bg-primary text-white shadow-md shadow-blue-200/50"
              : "border-slate-200 bg-white/60 text-slate-500 hover:border-blue-200 hover:text-blue-600",
          )}
        >
          {label} ({counts[key]})
        </button>
      ))}
    </div>
  );
}
