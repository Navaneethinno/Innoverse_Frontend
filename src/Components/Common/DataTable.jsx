import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Maximize2, Search } from "lucide-react";
import { Skeleton } from "@/Components/UI/skeleton";
import { NoDataAnimation } from "@/Components/Common/NoDataAnimation";
import { Modal } from "@/Components/Common/Modal";
import { cn } from "@/Utils/Lib/cn";

// Shared sort-arrow: stacked/dim ChevronUp+ChevronDown when a column isn't
// the active sort, a single solid colored arrow (direction-matched) when it
// is. Used by both the paginated table and the "view all" modal's table so
// the affordance is identical everywhere.
function SortIcon({ direction }) {
  if (!direction) return <ArrowUpDown size={12} className="text-slate-300" />;
  return direction === "asc" ? (
    <ChevronUp size={13} className="text-blue-600" />
  ) : (
    <ChevronDown size={13} className="text-blue-600" />
  );
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
    const getValue = column?.sortValue ?? ((row) => row[sort.key]);
    const sorted = [...rows].sort((a, b) => compareValues(getValue(a), getValue(b)));
    return sort.direction === "desc" ? sorted.reverse() : sorted;
  }, [rows, columns, sort]);
}

function TableHead({ columns, sort, onSort }) {
  return (
    <thead>
      <tr className="border-b border-slate-100/80">
        {columns.map((col) => (
          <th
            key={col.key}
            scope="col"
            className={cn(
              "whitespace-nowrap px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400",
              col.align === "left" ? "text-left" : "text-center",
            )}
          >
            {col.sortable === false ? (
              col.label
            ) : (
              <button
                type="button"
                onClick={() => onSort(col.key)}
                className={cn(
                  "inline-flex items-center gap-1 hover:text-slate-600",
                  sort.key === col.key && "text-blue-600",
                )}
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

function TableBody({ columns, rows, isLoading, emptyTitle, emptyDescription, rowKey, t }) {
  if (isLoading) {
    return (
      <tbody>
        {Array.from({ length: 5 }).map((_, i) => (
          <tr key={i} className="border-b border-slate-50">
            {columns.map((col) => (
              <td key={col.key} className="px-4 py-2.5">
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
          <td colSpan={columns.length} className="px-4 py-12 text-center">
            <NoDataAnimation className="mx-auto h-24 w-32" />
            <p className="text-sm font-bold text-slate-600">{emptyTitle ?? t("noRecordsFound")}</p>
            {emptyDescription && <p className="mt-1 text-xs text-slate-400">{emptyDescription}</p>}
          </td>
        </tr>
      </tbody>
    );
  }
  return (
    <tbody>
      {rows.map((row, i) => (
        <tr key={rowKey(row, i)} className="border-b border-slate-50 transition-colors hover:bg-slate-50/70">
          {columns.map((col) => (
            <td
              key={col.key}
              className={cn(
                "whitespace-nowrap px-4 py-2.5 text-xs text-slate-700",
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
 * - pageSize: default 10 (client-side pagination only)
 * - serverPagination: { page, totalPages, totalRecords, onPageChange }
 *   — when provided, `rows` is treated as already-paginated and DataTable
 *   only renders Prev/Next + "Page X of Y" from these values.
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
}) {
  const { t } = useTranslation("common");
  const [sort, setSort] = useState({ key: null, direction: null });
  const [page, setPage] = useState(1);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [viewAllSearch, setViewAllSearch] = useState("");

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

  const sortedRows = useSortedRows(rows, columns, sort);
  const isServer = !!serverPagination;

  const totalPages = isServer
    ? Math.max(1, serverPagination.totalPages || 1)
    : Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = isServer ? serverPagination.page : page;
  const pageRows = isServer ? sortedRows : sortedRows.slice((page - 1) * pageSize, page * pageSize);
  const totalRecords = isServer ? (serverPagination.totalRecords ?? sortedRows.length) : sortedRows.length;

  const goToPage = (next) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    if (isServer) serverPagination.onPageChange(clamped);
    else setPage(clamped);
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

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setViewAllOpen(true)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-blue-600 hover:bg-blue-50"
        >
          <Maximize2 size={12} /> {t("viewAll")}
        </button>
      </div>

      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(16px)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead columns={columns} sort={sort} onSort={onSort} />
            <TableBody
              columns={columns}
              rows={pageRows}
              isLoading={isLoading}
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
              rowKey={rowKey}
              t={t}
            />
          </table>
        </div>

        {!isLoading && totalRecords > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
            <span>
              {t("pageOf", { page: currentPage, total: totalPages })} · {totalRecords} {t("total")}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-semibold disabled:opacity-40"
              >
                <ChevronLeft size={13} /> {t("prev")}
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-semibold disabled:opacity-40"
              >
                {t("next")} <ChevronRight size={13} />
              </button>
            </div>
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
          <div className="border-b border-slate-100 px-5 py-3">
            <div className="relative max-w-xs">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={viewAllSearch}
                onChange={(e) => setViewAllSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-400"
              />
            </div>
            {fetchMore && viewAllSearch.trim() !== "" && (
              <p className="mt-1.5 text-[11px] text-amber-600">
                {t("searchLoadedOnlyHint")}
              </p>
            )}
          </div>
        )}
        <div ref={scrollRef} onScroll={fetchMore ? handleModalScroll : undefined} className="max-h-[65vh] overflow-y-auto px-5 py-3">
          <table className="w-full">
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
            <div className="py-3 text-center text-xs text-slate-400">
              {infiniteError ? (
                <button type="button" onClick={() => void loadNextInfinitePage()} className="font-semibold text-blue-600 underline">
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
