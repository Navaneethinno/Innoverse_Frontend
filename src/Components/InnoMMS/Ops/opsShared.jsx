import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { Pager } from "@/Components/Common/Pager";
import { SearchBox } from "@/Components/Common/SearchBox";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { Spinner } from "@/Components/Common/Spinner";
import { useLatest } from "@/Hooks/useLatest";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

// One page of a reply as { rows, total, summary }: data[0].{rows|items,total,summary}
// or the standard rows in `data` with `pagination`.
export function pageReply(reply) {
  const first = Array.isArray(reply?.data) ? reply.data[0] : reply?.data;
  if (first && (Array.isArray(first.rows) || Array.isArray(first.items))) {
    const rows = first.rows ?? first.items;
    return { rows, total: first.total ?? reply?.pagination?.totalRecords ?? rows.length, summary: first.summary ?? reply?.summary ?? null };
  }
  const rows = Array.isArray(reply?.data) ? reply.data : [];
  return { rows, total: reply?.pagination?.totalRecords ?? rows.length, summary: reply?.summary ?? null };
}

// A server-paged call outside the standard lists. `call(body)` gets
// { ...body, page, limit } (`sizeKey` renames limit, e.g. page_size).
export function usePagedCall({ call, body = {}, sizeKey = "limit", enabled = true }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [state, setState] = useState({ rows: [], total: 0, summary: null, loading: true });
  const [version, setVersion] = useState(0);
  const key = JSON.stringify(body);
  const latest = useLatest({ call, body });
  useEffect(() => setPage(1), [key, limit]);
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    const { call, body } = latest.current;
    Promise.resolve(call({ ...body, page, [sizeKey]: limit }))
      .then((r) => !cancelled && setState({ ...pageReply(r), loading: false }))
      .catch((e) => {
        if (cancelled) return;
        notifications.error(e.message);
        setState({ rows: [], total: 0, summary: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [key, page, limit, version, enabled, sizeKey, latest]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, page, setPage, limit, setLimit, reload };
}

// A paged table: columns [{ label, render(row) }].
export function PagedTable({ paged, columns, rowKey = (r) => r.id, empty, search, onSearch, searchPlaceholder, actions }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {(onSearch || actions) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          {onSearch && <SearchBox search={search} onSearch={onSearch} placeholder={searchPlaceholder} />}
          {actions}
        </div>
      )}
      {paged.loading ? (
        <div className="flex justify-center p-6">
          <Spinner />
        </div>
      ) : !paged.rows.length ? (
        <div className="p-4">
          <EmptyNote>{empty}</EmptyNote>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <SimpleTable columns={columns.map((c) => c.label)}>
            <tbody>
              {paged.rows.map((r, i) => (
                <tr key={rowKey(r, i)} className="border-t border-border align-top">
                  {columns.map((c) => (
                    <td key={c.label} className="px-3 py-2">
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </SimpleTable>
        </div>
      )}
      {paged.total > 0 && <Pager page={paged.page} pageSize={paged.limit} total={paged.total} onPageChange={paged.setPage} onPageSizeChange={paged.setLimit} />}
    </div>
  );
}

// Count tiles; a tile with onClick is a filter.
export function Tiles({ items }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {items.filter(Boolean).map((x) => {
        const Tag = x.onClick ? "button" : "div";
        return (
          <Tag
            key={x.key}
            type={x.onClick ? "button" : undefined}
            onClick={x.onClick}
            className={cn("rounded-xl border bg-card px-3 py-2 text-left", x.active ? "border-primary ring-1 ring-primary" : "border-border", x.onClick && "hover:border-primary")}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{x.label}</p>
            <p className={cn("mt-0.5 text-xl font-black tabular-nums", x.tone)}>{x.value ?? 0}</p>
          </Tag>
        );
      })}
    </div>
  );
}

// "Not allowed" reason for a button the backend's actions flag switched off.
export function useWhyNot() {
  const { t } = useTranslation("ops");
  return (allowed, hasPermission) => (!hasPermission ? t("whyNoPermission") : !allowed ? t("whyNotNow") : "");
}

// A refusal's text: the backend's message, or ours for a known message key
// (saf.not_pending -> ops:err_saf_not_pending).
export function errorText(t, error) {
  const raw = String(error?.code ?? error?.message ?? "");
  const key = `ops:err_${raw.replace(/\./g, "_")}`;
  return /^[a-z_]+\.[a-z_]+$/.test(raw) ? t(key, { defaultValue: error?.message ?? raw }) : (error?.message ?? raw);
}
