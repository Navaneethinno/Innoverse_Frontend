import { useTranslation } from "react-i18next";
import { cn } from "@/Utils/Lib/cn";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, CheckCircle2, Clock3, FilePen, Filter, ListChecks, PauseCircle } from "lucide-react";
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
  // Drafts (saved but never submitted) get their own tab, ahead of the
  // pending check since a draft may also carry a pending-looking process.
  if (status.includes("draft") || process.includes("draft") || Number(row?.status) === INSTITUTION_DRAFT_STATUS_CODE) return "draft";
  if (status.includes("pending") || process.includes("pending")) return "pending";
  if (status.includes("inactive") || process.includes("inactive")) return "inactive";
  if (status.includes("active") || status === "authorized" || row?.status === 1) return "active";
  return "inactive";
};

const TABS = [
  ["all", "statusAll", ListChecks],
  ["active", "statusActive", CheckCircle2],
  ["pending", "statusPending", Clock3],
  ["draft", "statusDraft", FilePen],
  ["inactive", "statusInactive", PauseCircle],
];

// `tabs`: [key, i18n key, Icon][] for a list whose tabs aren't the
// maker-checker statuses (e.g. the notification outbox's delivery status).
// `bare`: skip this component's own card chrome (border/shadow/padding) so
// a page can wrap it together with its DataTable into one continuous panel
// (search+filters bar flowing directly into the table, no visible seam) —
// see InstitutionProfile.jsx for the reference usage.
export function StatusFilterTabs({ tabs = TABS, rows = [], value, onChange, search = "", onSearch, searchPlaceholder, bare = false, actions = null, className, total, serverFiltered = false, sortBy, onSortChange }) {
  const { t } = useTranslation("common");
  const counts = rows.reduce(
    (result, row) => {
      result.all += 1;
      result[statusBucket(row)] += 1;
      return result;
    },
    { all: 0, active: 0, pending: 0, draft: 0, inactive: 0 },
  );
  // `rows` is only the loaded page on server-paginated lists. When the server
  // reports more records than that, All shows the real total and the
  // per-status counts are hidden rather than showing one page’s numbers.
  const partial = Number.isFinite(total) && total > counts.all;
  if (partial) counts.all = total;
  // serverFiltered: the list API already filtered by the selected tab
  // (`filter`), so `rows` holds only that tab and the server's total is only
  // that tab's count. Show a number on the selected tab alone.
  const countFor = (key) => {
    if (serverFiltered) return key === value ? (Number.isFinite(total) ? total : rows.length) : null;
    return partial && key !== "all" ? null : counts[key];
  };
  return (
    <div className={cn("flex flex-col gap-2", bare && "border-b border-border p-3", !bare && "rounded-xl border border-border bg-white p-3 shadow-sm", className)}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-3">
      <div data-tour="status-tabs" className="thin-scrollbar order-2 -mx-1 flex w-full min-w-0 items-center gap-1.5 overflow-x-auto px-1 sm:order-1 sm:mx-0 sm:w-auto sm:px-0">
        {tabs.map(([key, labelKey, Icon]) => {
          const isActive = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors",
                !isActive && "text-muted-foreground hover:bg-muted hover:text-slate-700",
              )}
              style={
                isActive
                  ? { background: "var(--primary-light)", color: "var(--primary)" }
                  : undefined
              }
            >
              <Icon
                size={14}
                strokeWidth={2}
                className={isActive ? undefined : "text-muted-foreground"}
                style={isActive ? { color: "var(--primary)" } : undefined}
              />
              {t(labelKey)}
              {countFor(key) != null && <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  !isActive && "bg-slate-100 text-muted-foreground",
                )}
                style={isActive ? { background: "var(--primary)", color: "var(--primary-foreground)" } : undefined}
              >
                {countFor(key)}
              </span>}
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
      {actions && <div data-tour="add" className="order-1 ml-auto shrink-0 sm:order-2 [&>button]:h-8">{actions}</div>}
      </div>

      {(onSearch || onSortChange) && (
      <div className="flex w-full items-center gap-2">
      {onSearch && (
        <div data-tour="search" className="relative w-full min-w-0 flex-1">
          <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={searchPlaceholder ?? t("searchPlaceholder")}
            className="h-9 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
      )}
      {/* sort_by: newest (desc) or oldest (asc) change first, applied by the
          server across every record, not just the loaded page. */}
      {onSortChange && (
        <button
          type="button"
          data-tour="sort"
          onClick={() => onSortChange(sortBy === "asc" ? "desc" : "asc")}
          title={t(sortBy === "asc" ? "sortOldestFirst" : "sortNewestFirst")}
          className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-white px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {sortBy === "asc" ? <ArrowUpNarrowWide size={14} /> : <ArrowDownWideNarrow size={14} />}
          <span className="hidden sm:inline">{t(sortBy === "asc" ? "sortOldestFirst" : "sortNewestFirst")}</span>
        </button>
      )}
      </div>
      )}
    </div>
  );
}
