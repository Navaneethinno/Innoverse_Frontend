import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { reportBuilderApi } from "@/Services/Reports/reportBuilder.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cellText, csvText, fileValue } from "./builderShared";
import { xlsxBlob } from "./xlsx";

// Option labels by field, from a report's `fields`, for enum cells.
export const optionLabelsOf = (fields) => Object.fromEntries((fields ?? []).filter((f) => f.options).map((f) => [f.key, Object.fromEntries(f.options.map((o) => [o.value, o.label]))]));

// The Excel / CSV of a run (`body` as sent to `run`, without paging): every
// row, up to the report's maximum. For ExportButtons' exportFile.
export const runExporter = (body, name, optionLabels) => async (format) => {
  const r = await reportBuilderApi.run({ ...body, all: true });
  const { columns = [], rows = [] } = rowsOf(r)[0] ?? {};
  const head = columns.map((c) => c.label);
  const data = rows.map((row) => row.map((v, i) => fileValue(v, columns[i], optionLabels)));
  const file = `${String(name || "report").replace(/[^\w-]+/g, "_")}_${new Date().toISOString().slice(0, 10)}`;
  return format === "CSV" ? { blob: new Blob([csvText(head, data)], { type: "text/csv;charset=utf-8" }), fileName: `${file}.csv` } : { blob: xlsxBlob(head, data), fileName: `${file}.xlsx` };
};

// A run as a server-paged table, with the API's warnings above it. Nothing
// shows until there is a `body`; a new body goes back to page 1.
export function RunResults({ body, title, optionLabels, maxPageSize = 1000, onRunning }) {
  const { t } = useTranslation("builder");
  const [result, setResult] = useState(null);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [running, setRunning] = useState(false);
  const key = JSON.stringify(body);

  useEffect(() => {
    setPage(1);
    setResult(null);
  }, [key]);

  useEffect(() => {
    if (!body) return undefined;
    let cancelled = false;
    setRunning(true);
    onRunning?.(true);
    reportBuilderApi
      .run({ ...body, page, page_size: limit })
      .then((r) => {
        if (cancelled) return;
        setResult(rowsOf(r)[0] ?? { columns: [], rows: [] });
        setPagination(r?.pagination ?? {});
      })
      .catch((e) => !cancelled && notifications.error(e.message))
      .finally(() => {
        if (cancelled) return;
        setRunning(false);
        onRunning?.(false);
      });
    return () => {
      cancelled = true;
    };
    // key stands for body; onRunning is a setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, limit]);

  const columns = useMemo(() => {
    const list = result?.columns ?? [];
    const index = Object.fromEntries(list.map((c, i) => [c.key, i]));
    return list.map((c, i) => ({
      key: `c${i}`,
      label: c.label,
      sortable: false,
      render: (row) => (
        <span className={`text-xs ${c.type === "text" ? "inline-block min-w-[8rem] max-w-xs whitespace-normal break-words" : "whitespace-nowrap"} ${["money", "number"].includes(c.type) ? "tabular-nums" : ""}`}>
          {cellText(row[i], c, row, index, optionLabels) || "—"}
        </span>
      ),
    }));
  }, [result, optionLabels]);

  if (!body) return null;
  return (
    <>
      {result?.warnings?.map((w) => (
        <p key={w} className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          <AlertTriangle size={14} /> {w}
        </p>
      ))}
      <DataTable
        columns={columns}
        rows={result?.rows ?? []}
        rowKey={(_, i) => i}
        isLoading={running}
        title={title}
        emptyTitle={t("noRows")}
        serverSorted
        serverPagination={{
          page,
          totalPages: pagination.totalPages ?? 1,
          totalRecords: pagination.totalRecords ?? 0,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(Math.min(n, maxPageSize));
            setPage(1);
          },
        }}
      />
    </>
  );
}
