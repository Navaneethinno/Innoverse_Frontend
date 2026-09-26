import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Maximize2, Search } from "lucide-react";
import { Skeleton } from "@/Components/UI/skeleton";
import { NoDataAnimation } from "@/Components/Common/NoDataAnimation";
import { Modal } from "@/Components/Common/Modal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { cn } from "@/Utils/Lib/cn";
import { useSessionState } from "@/Hooks/useSessionState";

// Shared sort-arrow: stacked/dim ChevronUp+ChevronDown when a column isn't
// the active sort, a single solid colored arrow (direction-matched) when it
// is. Used by both the paginated table and the "view all" modal's table so
// the affordance is identical everywhere.
function SortIcon({ direction }) {
  if (!direction) return <ArrowUpDown size={12} className="text-slate-300" />;
  return direction === "asc" ? (
    <ChevronUp size={13} style={{ color: "var(--primary)" }} />
  ) : (
    <ChevronDown size={13} style={{ color: "var(--primary)" }} />
  );
}

// Numbered page pills with an ellipsis for far-away pages, instead of a
// bare "Page X of Y" + manual go-to-page input — always shows the first
// and last page, plus a window around the current one, so a table with
// many pages doesn't turn into an unusable wall of buttons.
function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const window = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const pages = [...window].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const withEllipsis = [];
  let prev = null;
  for (const p of pages) {
    if (prev !== null && p - prev > 1) withEllipsis.push("…");
    withEllipsis.push(p);
    prev = p;
  }
  return withEllipsis;
}

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  const an = Number(a);
  const bn = Number(b);
  if (!Number.isNaN(an) && !Number.isNaN(bn) && a !== "" && b !== "") return an - bn;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function useSortedRows(rows, columns, sort) {
  return useMemo(() => {
    if (!sort.key) return rows;
    const column = columns.find((c) => c.key === sort.key);
    const getValue = column?.sortValue ?? ((row) =>
      sort.key === "updated_time" ? row.updated_time ?? row.created_time : row[sort.key]);
    const sorted = [...rows].sort((a, b) => compareValues(getValue(a), getValue(b)));
    return sort.direction === "desc" ? sorted.reverse() : sorted;
  }, [rows, columns, sort]);
}

function TableHead({ columns, sort, onSort, selectable = false, allSelected = false, onToggleAll, sortable = true }) {
  const { t } = useTranslation("common");
  return (
    <thead>
      <tr className="border-b-2 border-border">
        {selectable && <th className="w-10 px-3 py-2.5"><input type="checkbox" aria-label={t("selectAllRowsOnPage")} checked={allSelected} onChange={onToggleAll} className="h-3.5 w-3.5 rounded border-slate-300 accent-[var(--primary)]" /></th>}
        {columns.map((col) => (
          <th
            key={col.key}
            scope="col"
            className={cn(
              "whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-600",
              col.align === "left" ? "text-left" : "text-center",
            )}
          >
            {!sortable || col.sortable === false || (col.key === "actions" && col.sortable !== true) ? (
              col.label
            ) : (
              <button
                type="button"
                onClick={() => onSort(col.key)}
                className={cn(
                  // Buttons don't inherit font-size from an ancestor by
                  // default — the parent <th>'s text-xs silently did
                  // nothing for every sortable column (most of them), so
                  // they fell back to theme.css's global `button {
                  // font-size: var(--text-sm) }` base rule (14px) instead
                  // of the intended size, visibly larger than the one
                  // non-sortable "Actions" header's plain (correctly-sized)
                  // text.
                  "inline-flex items-center gap-1 text-xs hover:text-slate-800",
                )}
                style={sort.key === col.key ? { color: "var(--primary)" } : undefined}
              >
                {col.label}
                <SortIcon direction={sort.key === col.key ? sort.direction : null} />
              </button>
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function TableBody({ columns, rows, isLoading, emptyTitle, emptyDescription, rowKey, t, selectable = false, selectedKeys = new Set(), onToggleRow, compact = false }) {
  if (isLoading) {
    return (
      <tbody>
        {Array.from({ length: 5 }).map((_, i) => (
          <tr key={i} className="border-b border-slate-50">
            {selectable && <td className="w-10 px-3 py-2" />}
            {columns.map((col) => (
            <td key={col.key} className="px-3 py-2">
                <Skeleton className="mx-auto h-3.5 w-16" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    );
  }
  if (rows.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={columns.length + Number(selectable)} className={cn("px-4 text-center", compact ? "py-6" : "py-12")}>
            <NoDataAnimation className={cn("mx-auto", compact ? "h-16 w-24" : "h-24 w-32")} />
            <p className="text-sm font-bold text-slate-600">{emptyTitle ?? t("noRecordsFound")}</p>
            {emptyDescription && <p className="mt-1 text-xs text-muted-foreground">{emptyDescription}</p>}
          </td>
        </tr>
      </tbody>
    );
  }
  return (
    <tbody>
      {rows.map((row, i) => (
        <tr
          key={rowKey(row, i)}
          className={cn("border-b transition-colors hover:bg-[var(--primary-light)]", selectedKeys.has(String(rowKey(row, i))) && "bg-[var(--primary-light)]")}
          style={{ borderColor: "color-mix(in srgb, var(--border) 40%, transparent)" }}
        >
          {selectable && <td className="w-10 px-3 py-2.5"><input type="checkbox" aria-label={t("selectRow")} checked={selectedKeys.has(String(rowKey(row, i)))} onChange={() => onToggleRow(row, i)} className="h-3.5 w-3.5 rounded border-slate-300 accent-[var(--primary)]" /></td>}
          {columns.map((col) => (
            <td
              key={col.key}
              className={cn(
                "whitespace-nowrap px-3 py-2.5 text-xs text-slate-700",
                col.align === "left" ? "text-left" : "text-center",
              )}
            >
              {col.render ? col.render(row) : (row[col.key] ?? "—")}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/**
 * Shared table for all list pages: sortable headers, client-side pagination
 * (or server-side via `serverPagination` + `onPageChange`), and a "View all"
 * button opening a fullscreen modal with its own search box.
 *
 * Props:
 * - columns: [{ key, label, align, sortable, sortValue(row), render(row) }]
 * - rows: full row array (client-paginated) OR the current page's rows
 *   (server-paginated — pass serverPagination in that case)
 * - rowKey(row, index)
 * - isLoading
 * - pageSize: default 10 (client-side pagination only; ignored once the
 *   user picks a different page size from the built-in selector, which
 *   then drives client-side pagination directly)
 * - serverPagination: { page, totalPages, totalRecords, onPageChange,
 *   limit, onLimitChange } — when provided, `rows` is treated as
 *   already-paginated and DataTable renders Prev/Next + "Page X of Y" plus
 *   a page-size selector (only shown when `onLimitChange` is passed) and a
 *   "Go to page" input, all driven off these values.
 * - title: used as the "View all" modal heading
 * - searchableKeys: fields to search against inside the "View all" modal
 * - emptyTitle / emptyDescription
 * - fetchMore(page, limit): when provided, the "View all" modal switches
 *   from rendering the already-loaded `rows` to its own infinite-scroll
 *   fetch loop against the backend — loads page 1 on open, then the next
 *   page automatically as the user scrolls near the bottom, appending
 *   rows instead of ever holding the whole dataset in memory or in one
 *   request. Must resolve to { rows, totalPages }. Without this prop the
 *   modal falls back to listing whatever's already in `rows` (unchanged
 *   behavior for tables too small to matter).
 * - infiniteScrollLimit: page size used by fetchMore, default 50.
 * - persistKey: when set, the sort and (client-side) page / page size are
 *   kept for the browser-tab session under this key, so returning to the
 *   list after opening a record on its own route restores the same view.
 */
export function DataTable({
  columns,
  rows,
  rowKey = (row, i) => row.id ?? i,
  isLoading = false,
  pageSize = 10,
  serverPagination = null,
  title = "Records",
  searchableKeys = [],
  emptyTitle,
  emptyDescription,
  className,
  fetchMore = null,
  infiniteScrollLimit = 50,
  // Skip the top rounding/border on this table's own card so it can sit
  // directly beneath a StatusFilterTabs rendered with its own `bare` prop,
  // reading as one continuous panel instead of two stacked cards with a
  // gap between them. See StatusFilterTabs.jsx / InstitutionProfile.jsx.
  bare = false,
  // Off by default: row checkboxes imply a bulk action to apply to the
  // selection, and no page in this app has one wired to a real bulk API
  // yet — showing them everywhere was a checkbox with nothing behind it.
  // A page can still opt in explicitly once it has something real to do
  // with a selection.
  selectable = false,
  onSelectionChange,
  compact = false,
  persistKey = null,
  // The rows arrive already filtered and ordered by the server (sort_by);
  // don't re-sort them in the browser.
  serverSorted = false,
}) {
  const { t } = useTranslation("common");
  // Keep the newest record visible first on every table. Users can still
  // click any sortable header to override this default for the current view.
  const stateKey = (name) => (persistKey ? `${persistKey}:${name}` : null);
  const [sort, setSort] = useSessionState(stateKey("sort"), { key: "updated_time", direction: "desc" });
  const [page, setPage] = useSessionState(stateKey("tablePage"), 1);
  const [clientPageSize, setClientPageSize] = useSessionState(stateKey("tablePageSize"), pageSize);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [viewAllSearch, setViewAllSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  const [infiniteRows, setInfiniteRows] = useState([]);
  const [infinitePage, setInfinitePage] = useState(0);
  const [infiniteHasMore, setInfiniteHasMore] = useState(true);
  const [infiniteLoading, setInfiniteLoading] = useState(false);
  const [infiniteError, setInfiniteError] = useState(null);
  const scrollRef = useRef(null);

  const loadNextInfinitePage = useCallback(async () => {
    if (!fetchMore || infiniteLoading || !infiniteHasMore) return;
    setInfiniteLoading(true);
    setInfiniteError(null);
    const nextPage = infinitePage + 1;
    try {
      const result = await fetchMore(nextPage, infiniteScrollLimit);
      setInfiniteRows((current) => [...current, ...(result?.rows ?? [])]);
      setInfinitePage(nextPage);
      setInfiniteHasMore(nextPage < (result?.totalPages ?? nextPage));
    } catch (error) {
      setInfiniteError(error instanceof Error ? error.message : t("failedToLoadMoreRecords"));
    } finally {
      setInfiniteLoading(false);
    }
  }, [fetchMore, infiniteLoading, infiniteHasMore, infinitePage, infiniteScrollLimit]);

  // Reset and fetch page 1 fresh every time the modal opens, rather than
  // keeping stale data from a previous open (records may have changed via
  // an auth/edit/delete action in between).
  useEffect(() => {
    if (!fetchMore || !viewAllOpen) return;
    setInfiniteRows([]);
    setInfinitePage(0);
    setInfiniteHasMore(true);
    setInfiniteError(null);
  }, [fetchMore, viewAllOpen]);

  useEffect(() => {
    if (!fetchMore || !viewAllOpen) return;
    if (infinitePage === 0 && infiniteRows.length === 0 && infiniteHasMore) {
      void loadNextInfinitePage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMore, viewAllOpen, infinitePage, infiniteRows.length, infiniteHasMore]);

  const handleModalScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 120;
    if (nearBottom) void loadNextInfinitePage();
  };

  const onSort = (key) => {
    setSort((current) => {
      if (current.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: null };
    });
  };

  const serverOrdered = Boolean(serverPagination) || serverSorted;
  const sortedRows = useSortedRows(rows, columns, serverOrdered ? { key: null, direction: null } : sort);
  const isServer = !!serverPagination;
  const effectivePageSize = isServer ? serverPagination.limit ?? pageSize : clientPageSize;

  const totalPages = isServer
    ? Math.max(1, serverPagination.totalPages || 1)
    : Math.max(1, Math.ceil(sortedRows.length / effectivePageSize));
  const currentPage = isServer ? serverPagination.page : page;
  const pageRows = isServer ? sortedRows : sortedRows.slice((page - 1) * effectivePageSize, page * effectivePageSize);
  const totalRecords = isServer ? (serverPagination.totalRecords ?? sortedRows.length) : sortedRows.length;
  const visibleKeys = pageRows.map((row, index) => String(rowKey(row, (currentPage - 1) * effectivePageSize + index)));
  const allVisibleSelected = visibleKeys.length > 0 && visibleKeys.every((key) => selectedKeys.has(key));
  const notifySelection = (next) => {
    setSelectedKeys(next);
    onSelectionChange?.(rows.filter((row, index) => next.has(String(rowKey(row, index)))));
  };
  const toggleAllVisible = () => {
    const next = new Set(selectedKeys);
    if (allVisibleSelected) visibleKeys.forEach((key) => next.delete(key));
    else visibleKeys.forEach((key) => next.add(key));
    notifySelection(next);
  };
  const toggleRow = (row, index) => {
    const key = String(rowKey(row, (currentPage - 1) * effectivePageSize + index));
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key); else next.add(key);
    notifySelection(next);
  };

  // A delete/deauth (or a live update) can shrink a client-paginated list
  // below the current page, which would otherwise show “No records” while
  // records still exist on earlier pages.
  useEffect(() => {
    if (!isServer && page > totalPages) setPage(totalPages);
  }, [isServer, page, totalPages, setPage]);

  const goToPage = (next) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    if (isServer) serverPagination.onPageChange(clamped);
    else setPage(clamped);
  };

  const handlePageSizeChange = (next) => {
    const nextSize = Number(next) || effectivePageSize;
    if (isServer) {
      if (serverPagination.onLimitChange) serverPagination.onLimitChange(nextSize);
    } else {
      setClientPageSize(nextSize);
      setPage(1);
    }
  };

  const sortedInfiniteRows = useSortedRows(infiniteRows, columns, sort);
  const modalSourceRows = fetchMore ? sortedInfiniteRows : sortedRows;

  const modalRows = useMemo(() => {
    const q = viewAllSearch.trim().toLowerCase();
    if (!q) return modalSourceRows;
    return modalSourceRows.filter((row) =>
      searchableKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(q)),
    );
  }, [modalSourceRows, viewAllSearch, searchableKeys]);

  const viewAllButton = (
    <button
      type="button"
      data-tour="view-all"
      onClick={() => setViewAllOpen(true)}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[var(--primary)] hover:bg-[var(--primary-light)]"
    >
      <Maximize2 size={12} /> {t("viewAll")}
    </button>
  );

  return (
    <div className={className}>
      {/* "View all" normally sits in the table’s own header row. A compact
          table has no header row, so there it floats above the card. */}
      {!bare && compact && <div className="mb-2 flex items-center justify-end">{viewAllButton}</div>}

      <div
        className={cn("overflow-hidden", bare ? "rounded-b-2xl" : "rounded-2xl")}
        style={
          bare
            ? undefined
            : {
                background: "var(--glass-bg)",
                backdropFilter: "blur(16px)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--glass-shadow)",
              }
        }
      >
        {!compact && <div className="flex min-h-10 items-center justify-between border-b border-border px-3.5">
          <span className="text-xs font-medium text-muted-foreground">
            {selectable && selectedKeys.size > 0
              ? t("selectedCount", { count: selectedKeys.size })
              : t("recordsCount", { count: totalRecords })}
          </span>
          {viewAllButton}
        </div>}
        <div className="overflow-x-auto">
          <table data-tour="table" className="w-full min-w-max">
            <TableHead columns={columns} sort={serverOrdered ? {} : sort} onSort={onSort} selectable={selectable} allSelected={allVisibleSelected} onToggleAll={toggleAllVisible} sortable={!serverOrdered} />
            <TableBody
              columns={columns}
              rows={pageRows}
              isLoading={isLoading}
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
              rowKey={rowKey}
              t={t}
              selectable={selectable}
              selectedKeys={selectedKeys}
              onToggleRow={toggleRow}
              compact={compact}
            />
          </table>
        </div>

        {!isLoading && totalRecords > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
            <span className="whitespace-nowrap">
              {t("showingEntries", {
                from: (currentPage - 1) * effectivePageSize + 1,
                to: Math.min(currentPage * effectivePageSize, totalRecords),
                total: totalRecords,
              })}
            </span>

            <div data-tour="pagination" className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={13} /> {t("prev")}
              </button>
              {getPageNumbers(currentPage, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1.5 text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goToPage(p)}
                    aria-current={p === currentPage ? "page" : undefined}
                    className={cn(
                      "min-w-[28px] rounded-lg px-2 py-1.5 font-semibold transition-colors",
                      p === currentPage
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-600 hover:bg-muted",
                    )}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {t("next")} <ChevronRight size={13} />
              </button>
            </div>

            {(!isServer || serverPagination.onLimitChange) && (
              <div data-tour="page-size" className="flex items-center gap-1.5 whitespace-nowrap">
                <span>{t("showEntries")}</span>
                <FilterSelect
                  className="w-20"
                  size="sm"
                  value={effectivePageSize}
                  onChange={(next) => handlePageSizeChange(next)}
                  options={[10, 20, 25, 50, 100].map((size) => ({ value: size, label: String(size) }))}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        open={viewAllOpen}
        onClose={() => setViewAllOpen(false)}
        title={title}
        subtitle={
          fetchMore
            ? `${modalRows.length} ${t("loaded")}${infiniteHasMore ? " · " + t("scrollForMore") : " · " + t("allLoaded")}`
            : `${modalRows.length} ${t("of")} ${sortedRows.length} ${t("recordsWord")}`
        }
        size="xl"
        bodyClassName="px-0 py-0"
      >
        {searchableKeys.length > 0 && (
          <div className="border-b border-border px-5 py-3">
            <div className="relative max-w-xs">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={viewAllSearch}
                onChange={(e) => setViewAllSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-xl border border-border py-2 pl-8 pr-3 text-sm outline-none focus:border-[var(--primary)]"
              />
            </div>
            {fetchMore && viewAllSearch.trim() !== "" && (
              <p className="mt-1.5 text-[11px] text-amber-600">
                {t("searchLoadedOnlyHint")}
              </p>
            )}
          </div>
        )}
        <div ref={scrollRef} onScroll={fetchMore ? handleModalScroll : undefined} className="thin-scrollbar max-h-[65vh] overflow-y-auto overflow-x-auto px-5 py-3">
          <table data-tour="table" className="w-full min-w-max">
            <TableHead columns={columns} sort={sort} onSort={onSort} />
            <TableBody
              columns={columns}
              rows={modalRows}
              isLoading={fetchMore ? infiniteRows.length === 0 && infiniteLoading : false}
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
              rowKey={rowKey}
              t={t}
            />
          </table>
          {fetchMore && infiniteRows.length > 0 && (
            <div className="py-3 text-center text-xs text-muted-foreground">
              {infiniteError ? (
                <button type="button" onClick={() => void loadNextInfinitePage()} className="font-semibold text-[var(--primary)] underline">
                  {t("failedLoadMoreRetry")}
                </button>
              ) : infiniteLoading ? (
                t("loadingMore")
              ) : infiniteHasMore ? (
                t("scrollForMore")
              ) : (
                t("allRecordsLoaded")
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
