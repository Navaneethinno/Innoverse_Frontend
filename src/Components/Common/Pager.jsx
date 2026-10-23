import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { cn } from "@/Utils/Lib/cn";

export const PAGE_SIZES = [10, 20, 25, 50, 100];

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

// The footer every paged list shares: "Showing x–y of n", the page pills,
// and the page-size picker (left out when `onPageSizeChange` is not given;
// `sizes`: the list's own choices, e.g. 10, 25, 50, 100).
export function Pager({ page, pageSize, total, onPageChange, onPageSizeChange, sizes = PAGE_SIZES, className }) {
  const { t } = useTranslation("common");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground", className)}>
      <span className="whitespace-nowrap">
        {t("showingEntries", { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total })}
      </span>

      <div data-tour="pagination" className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={13} /> {t("prev")}
        </button>
        {getPageNumbers(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn("min-w-[28px] rounded-lg px-2 py-1.5 font-semibold transition-colors", p === page ? "bg-primary text-primary-foreground" : "text-slate-600 hover:bg-muted")}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {t("next")} <ChevronRight size={13} />
        </button>
      </div>

      {onPageSizeChange && (
        <div data-tour="page-size" className="flex items-center gap-1.5 whitespace-nowrap">
          <span>{t("showEntries")}</span>
          <FilterSelect className="w-20" size="sm" value={pageSize} onChange={(next) => onPageSizeChange(Number(next))} options={sizes.map((size) => ({ value: size, label: String(size) }))} />
        </div>
      )}
    </div>
  );
}

// A list that is not a table (a history timeline) paged like one: 10 a
// page, the size the user picks after that. `children(pageItems, offset)`
// renders the page; the pager shows only when there is more than one page
// worth choosing between.
export function PagedList({ items, children }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const total = items?.length ?? 0;
  useEffect(() => setPage(1), [total, pageSize]);
  const offset = (page - 1) * pageSize;
  return (
    <>
      {children((items ?? []).slice(offset, offset + pageSize), offset)}
      {total > PAGE_SIZES[0] && <Pager className="mt-3 rounded-xl" page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />}
    </>
  );
}
