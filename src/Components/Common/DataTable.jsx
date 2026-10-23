import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpDown, ChevronUp, ChevronDown, Maximize2 } from "lucide-react";
import { Skeleton } from "@/Components/UI/skeleton";
import { NoDataAnimation } from "@/Components/Common/NoDataAnimation";
import { Modal } from "@/Components/Common/Modal";
import { Pager } from "@/Components/Common/Pager";
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

// Rows whose content changed since the last rows (a live refresh): those
// glow for a moment. A new page or filter (mostly new keys) is not a change.
function useChangedKeys(rows, rowKey) {
  const sig = new Map(rows.map((row, i) => [String(rowKey(row, i)), JSON.stringify(row)]));
  const text = JSON.stringify([...sig]);
  const [seen, setSeen] = useState({ text: null, sig: null, changed: new Set() });
  if (text !== seen.text) {
    const changed = new Set();
    if (seen.sig?.size) {
      const kept = [...sig.keys()].filter((k) => seen.sig.has(k)).length;
      if (kept * 2 >= seen.sig.size) for (const [k, v] of sig) if (seen.sig.get(k) !== v) changed.add(k);
    }
    setSeen({ text, sig, changed });
  }
  return seen.changed;
}

// React keys must be unique: a repeated rowKey (one user with several KYC
// records, say) gets its position added, or React would reuse the wrong row
// and leave stale or duplicated rows on screen.
function uniqueKeys(rows, rowKey) {
  const seen = new Set();
  return rows.map((row, i) => {
    const key = String(rowKey(row, i));
    const unique = seen.has(key) ? `${key}#${i}` : key;
    seen.add(unique);
    return unique;
  });
}

function TableBody({ columns, rows, isLoading, emptyTitle, emptyDescription, rowKey, t, selectable = false, selectedKeys = new Set(), onToggleRow, compact = false }) {
  const changed = useChangedKeys(rows, rowKey);
  const keys = uniqueKeys(rows, rowKey);
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
          key={keys[i]}
          className={cn("border-b transition-colors hover:bg-[var(--primary-light)]", changed.has(String(rowKey(row, i))) && "row-flash", selectedKeys.has(String(rowKey(row, i))) && "bg-[var(--primary-light)]")}
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
 * - emptyTitle / emptyDescription
 * "View all" lists every record. On a server-paginated table it pages
 * through the server itself (the page's own call, so its tab, search and
 * sort apply): 50 a page, the next page as the user scrolls near the
 * bottom, never everything in one call. The table's page and page size
 * come back when it closes. Nothing is filtered in the browser.
 * - persistKey: when set, the sort and (client-side) page / page size are
 *   kept for the browser-tab session under this key, so returning to the
 *   list after opening a record on its own route restores the same view.
 */
const INSTITUTION_COLUMNS = new Set(["inst_profile_name", "inst_profile_id", "institution", "institution_name"]);

export function DataTable({
  columns: allColumns,
  rows,
  rowKey = (row, i) => row.id ?? i,
  isLoading = false,
  pageSize = 10,
  serverPagination = null,
  title = "Records",
  emptyTitle,
  emptyDescription,
  className,
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
  // A bank / fintech user only ever sees its own institution: no
  // institution column (institution scope handoff).
  const canChoose = useCanChooseInstitution();
  // A System or service-provider user sees several institutions' rows: a
  // table without its own institution column gets one, second, whenever
  // the rows say which institution they belong to.
  const showsInstitution = canChoose && !allColumns.some((c) => INSTITUTION_COLUMNS.has(c.key)) && (rows ?? []).some((r) => r?.inst_profile_name);
  const columns = useMemo(() => {
    if (!canChoose) return allColumns.filter((c) => !INSTITUTION_COLUMNS.has(c.key));
    if (!showsInstitution) return allColumns;
    const column = { key: "inst_profile_name", label: t("institution"), render: (r) => <span className="text-xs">{r.inst_profile_name ?? "-"}</span> };
    return [...allColumns.slice(0, 1), column, ...allColumns.slice(1)];
  }, [allColumns, canChoose, showsInstitution, t]);
  // Keep the newest record visible first on every table. Users can still
  // click any sortable header to override this default for the current view.
  const stateKey = (name) => (persistKey ? `${persistKey}:${name}` : null);
  const [sort, setSort] = useSessionState(stateKey("sort"), { key: "updated_time", direction: "desc" });
  const [page, setPage] = useSessionState(stateKey("tablePage"), 1);
  const [clientPageSize, setClientPageSize] = useSessionState(stateKey("tablePageSize"), pageSize);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  const scrollRef = useRef(null);
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

  // "View all" on a server table: the page's own paging, page by page.
  // loaded: { [page]: rows }, so a page delivered again (a live refresh)
  // replaces itself instead of adding twice.
  const VIEW_ALL_LIMIT = 50;
  const [loaded, setLoaded] = useState({});
  const restore = useRef(null);
  const serverPage = isServer ? serverPagination.page : null;
  useEffect(() => {
    // Kept once the table shows the asked page at the View all size.
    const sized = !serverPagination?.onLimitChange || effectivePageSize === VIEW_ALL_LIMIT;
    if (!viewAllOpen || !isServer || isLoading || !sized) return;
    // Pages often pass a fresh array each render: store only real changes.
    setLoaded((current) => (current[serverPage] && JSON.stringify(current[serverPage]) === JSON.stringify(rows) ? current : { ...current, [serverPage]: rows }));
    // `rows` arrives with the page it belongs to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewAllOpen, isServer, isLoading, serverPage, rows, effectivePageSize]);
  const openViewAll = () => {
    if (isServer) {
      restore.current = { page: serverPagination.page, limit: effectivePageSize };
      setLoaded({});
      if (serverPagination.onLimitChange && effectivePageSize !== VIEW_ALL_LIMIT) serverPagination.onLimitChange(VIEW_ALL_LIMIT);
      serverPagination.onPageChange(1);
    }
    setViewAllOpen(true);
  };
  const closeViewAll = () => {
    setViewAllOpen(false);
    if (isServer && restore.current) {
      const back = restore.current;
      restore.current = null;
      setLoaded({});
      if (serverPagination.onLimitChange && back.limit !== effectivePageSize) serverPagination.onLimitChange(back.limit);
      serverPagination.onPageChange(back.page);
    }
  };
  const loadedPages = Object.keys(loaded).map(Number).sort((x, y) => x - y);
  const lastLoaded = loadedPages.length ? loadedPages[loadedPages.length - 1] : 0;
  const hasMore = isServer && lastLoaded < totalPages;
  const handleModalScroll = () => {
    const el = scrollRef.current;
    if (!el || !isServer || isLoading || !hasMore || lastLoaded === 0) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) serverPagination.onPageChange(lastLoaded + 1);
  };
  const modalRows = isServer ? loadedPages.flatMap((p) => loaded[p]) : sortedRows;

  const viewAllButton = (
    <button
      type="button"
      data-tour="view-all"
      onClick={openViewAll}
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
          <Pager
            page={currentPage}
            pageSize={effectivePageSize}
            total={totalRecords}
            onPageChange={goToPage}
            onPageSizeChange={!isServer || serverPagination.onLimitChange ? handlePageSizeChange : undefined}
            sizes={serverPagination?.pageSizes}
          />
        )}
      </div>

      <Modal
        open={viewAllOpen}
        onClose={closeViewAll}
        title={title}
        subtitle={isServer ? `${modalRows.length} ${t("of")} ${totalRecords} ${t("recordsWord")}${hasMore ? " · " + t("scrollForMore") : ""}` : `${sortedRows.length} ${t("recordsWord")}`}
        size="xl"
        bodyClassName="px-0 py-0"
      >
        <div ref={scrollRef} onScroll={isServer ? handleModalScroll : undefined} className="thin-scrollbar max-h-[65vh] overflow-y-auto overflow-x-auto px-5 py-3">
          <table data-tour="table" className="w-full min-w-max">
            <TableHead columns={columns} sort={serverOrdered ? {} : sort} onSort={onSort} sortable={!serverOrdered} />
            <TableBody columns={columns} rows={modalRows} isLoading={isServer && !modalRows.length && isLoading} emptyTitle={emptyTitle} emptyDescription={emptyDescription} rowKey={rowKey} t={t} />
          </table>
          {isServer && modalRows.length > 0 && (
            <div className="py-3 text-center text-xs text-muted-foreground">
              {isLoading ? t("loadingMore") : hasMore ? (
                <button type="button" onClick={() => serverPagination.onPageChange(lastLoaded + 1)} className="font-semibold text-[var(--primary)] hover:underline">
                  {t("scrollForMore")}
                </button>
              ) : t("allRecordsLoaded")}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
