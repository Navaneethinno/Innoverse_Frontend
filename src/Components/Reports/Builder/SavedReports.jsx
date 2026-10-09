import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FolderOpen, Play } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { RowActions } from "@/Components/Common/RowActions";
import { SearchBox } from "@/Components/Common/SearchBox";
import { Spinner } from "@/Components/Common/Spinner";
import { accountDate } from "@/Components/Epurse/Accounts/accountShared";
import { useListSearch } from "@/Hooks/useListSearch";
import { reportBuilderApi } from "@/Services/Reports/reportBuilder.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ExportButtons, glassCard } from "../Shared/reportShared";
import { allComplete, isGroup, newGroup, strip, withRequired } from "./builderShared";
import { FilterGroup } from "./FilterBuilder";
import { RunResults, optionLabelsOf, runExporter } from "./RunResults";

// REPORTS > Saved Reports (menu 212): every saved report the user may open
// (their own and those shared with them). Opening one runs it; a filter
// the report needs at run time (User Activity's user and date) is asked
// for first. Download as Excel / CSV / PDF.
export function SavedReports() {
  const { t } = useTranslation("builder");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { term, bind } = useListSearch(() => setPage(1));
  const [data, setData] = useState({ rows: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reportBuilderApi.template
      .list({ page, page_size: limit, ...(term ? { search: term } : {}) })
      .then((r) => !cancelled && setData({ rows: rowsOf(r), total: r?.pagination?.totalRecords ?? 0, pages: r?.pagination?.totalPages ?? 1 }))
      .catch((e) => !cancelled && notifications.error(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, limit, term]);

  if (open) return <RunSaved report={open} onBack={() => setOpen(null)} />;

  const columns = [
    {
      key: "name",
      label: t("name"),
      align: "left",
      render: (r) => (
        <button type="button" onClick={() => setOpen(r)} className="text-left">
          <p className="text-xs font-bold text-primary hover:underline">{r.name}</p>
          {r.description && <p className="max-w-xs truncate text-[11px] text-muted-foreground">{r.description}</p>}
        </button>
      ),
    },
    { key: "folder", label: t("folder"), render: (r) => <span className="text-xs">{r.folder || "—"}</span> },
    { key: "source_label", label: t("report"), render: (r) => <span className="text-xs font-semibold">{r.source_label}</span> },
    { key: "owner_name", label: t("owner"), render: (r) => <span className="text-xs">{r.is_owner ? t("yours") : r.owner_name}</span> },
    { key: "updated_time", label: t("updated"), render: (r) => <span className="whitespace-nowrap text-xs">{accountDate(r.updated_time ?? r.created_time)}</span> },
    { key: "actions", label: t("open"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpen(r)} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
          <FolderOpen size={22} className="text-primary" /> {t("title_saved")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle_saved")}</p>
      </div>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <SearchBox {...bind} placeholder={t("searchSaved")} />
      </div>
      <DataTable
        columns={columns}
        rows={data.rows}
        rowKey={(r) => r.id}
        isLoading={loading}
        title={t("title_saved")}
        emptyTitle={t(term ? "noSavedMatch" : "noSavedShared")}
        serverSorted
        serverPagination={{
          page,
          totalPages: data.pages,
          totalRecords: data.total,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(Math.min(n, 1000));
            setPage(1);
          },
        }}
      />
    </div>
  );
}

// One saved report, run. Filters the report must have at run time and the
// saved definition leaves open are asked for, and sent in `filters` (added
// to the saved ones).
function RunSaved({ report, onBack }) {
  const { t } = useTranslation("builder");
  const [meta, setMeta] = useState(null);
  const [extra, setExtra] = useState(null);
  const [body, setBody] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    reportBuilderApi
      .fields({ source: report.source })
      .then((r) => {
        if (cancelled) return;
        const m = rowsOf(r)[0];
        const saved = (report.definition?.filters?.rules ?? []).filter((rule) => !isGroup(rule)).map((rule) => rule.field);
        const missing = (m.required_filters ?? []).filter((key) => !saved.includes(key));
        const asked = withRequired(newGroup(), { ...m, required_filters: missing });
        setMeta({ ...m, required_filters: missing });
        setExtra(asked);
        if (!missing.length) setBody({ template_id: report.id });
      })
      .catch((e) => !cancelled && notifications.error(e.message));
    return () => {
      cancelled = true;
    };
  }, [report]);

  const optionLabels = useMemo(() => optionLabelsOf(meta?.fields), [meta]);
  const ready = extra && allComplete(extra);
  const run = () => setBody({ template_id: report.id, ...(extra.rules.length ? { filters: strip(extra) } : {}) });

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToSaved")}
      </button>
      <div className="mb-4 grid gap-3 rounded-2xl p-4" style={glassCard}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-black text-slate-800">{report.name}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">{[report.source_label, report.folder, report.is_owner ? t("yours") : t("byOwner", { name: report.owner_name }), report.description].filter(Boolean).join(" · ")}</p>
          </div>
          <ExportButtons disabled={!body} exportFile={runExporter(body, report.name, optionLabels)} />
        </div>
        {!meta ? (
          <Spinner size={16} />
        ) : (
          meta.required_filters.length > 0 && (
            <div className="grid gap-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground">{t("needsFilters")}</p>
              <FilterGroup source={report.source} meta={meta} group={extra} total={extra.rules.length} onChange={setExtra} />
              <div>
                <Button icon={Play} disabled={!ready} loading={running} onClick={run}>
                  {t("run")}
                </Button>
              </div>
            </div>
          )
        )}
      </div>
      <RunResults body={body} title={report.name} optionLabels={optionLabels} maxPageSize={meta?.limits?.max_page_size} onRunning={setRunning} />
    </div>
  );
}
