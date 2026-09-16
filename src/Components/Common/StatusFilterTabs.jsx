import { cn } from "@/Utils/Lib/cn";
import { CheckCircle2, Clock3, Filter, ListChecks, PauseCircle } from "lucide-react";
import { INSTITUTION_DRAFT_STATUS_CODE } from "@/Utils/Constant";

// INSTITUTION_DRAFT_STATUS_CODE is env-overridable (defaults to 9) rather
// than a bare literal, since this component is shared across every
// maker-checker list in the app (Institution sub-entities, MasterConfig,
// UserManagement, ...) and all of them use the same numeric draft code.
export const statusBucket = (row) => {
  const status = String(row?.status_name ?? row?.auth_status ?? "").toLowerCase();
  const process = String(row?.process_status_name ?? "").toLowerCase();
  // Pending must be checked BEFORE active/inactive: a record awaiting
  // checker approval keeps its live status_name (e.g. "Active") while
  // process_status_name/auth_status carries the actual pending workflow
  // state (e.g. "Pending Delete") — confirmed live via
  // /config/acct_product/list, which returns exactly that combination
  // while a delete is pending. Checking status first made every pending
  // row on an otherwise-active record bucket into "Active" instead of
  // "Pending", silently zeroing out the Pending tab's count.
  if (
    status.includes("pending") ||
    process.includes("pending") ||
    status.includes("draft") ||
    process.includes("draft") ||
    Number(row?.status) === INSTITUTION_DRAFT_STATUS_CODE
  )
    return "pending";
  if (status.includes("inactive") || process.includes("inactive")) return "inactive";
  if (status.includes("active") || status === "authorized" || row?.status === 1) return "active";
  return "inactive";
};

const TABS = [
  ["all", "All", ListChecks],
  ["active", "Active", CheckCircle2],
  ["pending", "Pending", Clock3],
  ["inactive", "Inactive", PauseCircle],
];

// `bare`: skip this component's own card chrome (border/shadow/padding) so
// a page can wrap it together with its DataTable into one continuous panel
// (search+filters bar flowing directly into the table, no visible seam) —
// see InstitutionProfile.jsx for the reference usage.
export function StatusFilterTabs({ rows = [], value, onChange, search = "", onSearch, searchPlaceholder = "Search institutions...", bare = false, actions = null, className }) {
  const counts = rows.reduce(
    (result, row) => {
      result.all += 1;
      result[statusBucket(row)] += 1;
      return result;
    },
    { all: 0, active: 0, pending: 0, inactive: 0 },
  );
  return (
    <div className={cn("flex flex-col gap-2", bare && "border-b border-slate-100 p-3", !bare && "rounded-xl border border-slate-200 bg-white p-3 shadow-sm", className)}>
      <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
        {TABS.map(([key, label, Icon]) => {
          const isActive = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors",
                isActive ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
              )}
            >
              <Icon size={14} strokeWidth={2} className={isActive ? "text-blue-600" : "text-slate-400"} />
              {label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500",
                )}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>
      {/* [&>button]:h-8 forces whatever action button a page passes in
          (varies per page — plain <button>, motion.button, different
          padding/font-size choices) to the exact same height as the tab
          pills beside it, rather than relying on every page's own
          className matching pixel-for-pixel (a 4px mismatch was visible
          before: the tabs' icon+count-badge content stack renders taller
          than a plain label at the same padding). */}
      {actions && <div className="shrink-0 [&>button]:h-8">{actions}</div>}
      </div>

      {onSearch && (
        <div className="relative w-full max-w-sm sm:max-w-none">
          <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
      )}
    </div>
  );
}
