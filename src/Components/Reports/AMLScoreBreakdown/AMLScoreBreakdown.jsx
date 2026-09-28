import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowDownUp } from "lucide-react";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { amlBreakdownApi } from "@/Services/Reports/amlBreakdown.api";
import { riskActionApi } from "@/Services/Epurse/risk.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { useAmlBands } from "@/Components/InnoAML/AMLScreening/Screenings/useAmlBands";
import {
  BandChip,
  ExportButtons,
  PeriodChips,
  atIst,
  glassCard,
  periodBody,
  useReportDetail,
} from "../Shared/reportShared";
import { AmlRunDetail } from "./AmlRunDetail";

const KINDS = ["INDIVIDUAL", "CORPORATE"];
const TRIGGERS = ["SUBMIT", "RESCREEN", "ONGOING"];
const numberInput = "w-20 rounded-lg border px-2.5 py-1.5 text-xs";

function useRiskActions() {
  const [actions, setActions] = useState([]);
  useEffect(() => {
    riskActionApi
      .list({ page: 1, limit: 200 })
      .then((r) => setActions(rowsOf(r).filter((a) => Number(a.status) === 1)))
      .catch(() => setActions([]));
  }, []);
  return actions;
}

// Reports > AML Score Breakdown (menu 108, View only): customers' kept AML
// screening runs (the AML score only, not risk), each opening how its score
// was reached. Defaults to each customer's current screening.
export function AMLScoreBreakdown() {
  const { t } = useTranslation(["reports", "common"]);
  const bands = useAmlBands();
  const actions = useRiskActions();
  const [filters, setFilters] = useState({
    customer_kind: "",
    period: "",
    from: "",
    to: "",
    band_code: "",
    risk_action_id: "",
    min_score: "",
    max_score: "",
    trigger: "",
    status: "",
    matched_only: false,
    latest_only: true,
  });
  const [nameInput, setNameInput] = useState("");
  const [name, setName] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState("desc");
  const [perMatch, setPerMatch] = useState(false);
  const run = useReportDetail();

  // Customer name is a server search: wait for a pause in typing.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setName(nameInput.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [nameInput]);

  // Every field is optional; null only while a Custom period lacks From.
  const body = useMemo(() => {
    const f = filters;
    const period = periodBody(f);
    if (!period) return null;
    const num = (v) => (v === "" ? undefined : Number(v));
    return Object.fromEntries(
      Object.entries({
        ...period,
        customer_kind: f.customer_kind || undefined,
        latest_only: f.latest_only,
        band_codes: f.band_code ? [f.band_code] : undefined,
        risk_action_ids: f.risk_action_id ? [Number(f.risk_action_id)] : undefined,
        min_score: num(f.min_score),
        max_score: num(f.max_score),
        matched_only: f.matched_only || undefined,
        triggers: f.trigger ? [f.trigger] : undefined,
        status: f.status || undefined,
        name: name || undefined,
      }).filter(([, v]) => v !== undefined),
    );
  }, [filters, name]);
  const bodyKey = JSON.stringify(body);

  const load = useCallback(async () => {
    const current = JSON.parse(bodyKey);
    if (!current) return;
    setLoading(true);
    try {
      const response = await amlBreakdownApi.list({ ...current, page, limit, sort_by: sortBy });
      setRows(rowsOf(response));
      setPagination(response?.pagination ?? {});
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [bodyKey, page, limit, sortBy]);
  useEffect(() => {
    void load();
  }, [load]);

  const set = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const opt = (list, prefix, allKey) => [
    { value: "", label: t(allKey) },
    ...list.map((v) => ({ value: v, label: t(`${prefix}${v}`) })),
  ];

  const columns = [
    {
      key: "screened_at",
      sortable: false,
      label: (
        <button
          type="button"
          onClick={() => {
            setSortBy((s) => (s === "desc" ? "asc" : "desc"));
            setPage(1);
          }}
          className="inline-flex items-center gap-1"
          title={t(sortBy === "desc" ? "newestFirst" : "oldestFirst")}
        >
          {t("screenedAt")} <ArrowDownUp size={11} />
        </button>
      ),
      render: (row) => (
        <span
          className={`whitespace-nowrap text-xs ${row.is_latest ? "" : "text-muted-foreground"}`}
        >
          {atIst(row.screened_at)}
          {!row.is_latest && (
            <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] font-bold">
              {t("earlier")}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "customer_name",
      label: t("customer"),
      align: "left",
      render: (row) => (
        <button
          type="button"
          onClick={() => run.show(row)}
          className={`text-left text-xs font-semibold hover:underline ${row.is_latest ? "text-primary" : "text-muted-foreground"}`}
        >
          {row.customer_name || row.reference_id}
          {row.inst_profile_name && (
            <span className="block text-[10px] font-normal text-muted-foreground">
              {row.inst_profile_name}
            </span>
          )}
        </button>
      ),
    },
    {
      key: "customer_kind",
      label: t("type"),
      render: (row) => <span className="text-xs">{t(`kind_${row.customer_kind}`)}</span>,
    },
    {
      key: "score",
      label: t("score"),
      render: (row) => (
        <span className="inline-flex items-center gap-1 font-black tabular-nums">
          {row.score}
          {row.raw_score != null && row.raw_score !== row.score && (
            <span className="text-[10px] font-semibold text-muted-foreground">
              ({t("raw", { score: row.raw_score })})
            </span>
          )}
          {row.status === "ERROR" && (
            <UiTooltip label={t("someNotScreened")}>
              <AlertTriangle size={13} className="text-amber-600" />
            </UiTooltip>
          )}
        </span>
      ),
    },
    {
      key: "band",
      label: t("band"),
      render: (row) => (
        <BandChip name={row.band?.name ?? t("noBand")} color={row.band?.color_code} />
      ),
    },
    {
      key: "risk_action",
      label: t("riskAction"),
      render: (row) => <span className="text-xs">{row.band?.risk_action_name ?? "—"}</span>,
    },
    {
      key: "matched_parties",
      label: t("partiesMatched"),
      render: (row) => (
        <span className="text-xs tabular-nums">
          {t("nOfM", { n: row.matched_parties ?? 0, m: row.parties ?? 0 })}
        </span>
      ),
    },
    {
      key: "match_count",
      label: t("matches"),
      render: (row) => <span className="text-xs tabular-nums">{row.match_count ?? 0}</span>,
    },
    {
      key: "trigger_name",
      label: t("how"),
      render: (row) => <span className="text-xs">{row.trigger_name}</span>,
    },
    {
      key: "screened_by",
      label: t("by"),
      render: (row) => <span className="text-xs">{row.screened_by ?? "-"}</span>,
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (row) => <RowActions buttons={{ view: true }} onView={() => run.show(row)} />,
    },
  ];

  return (
    <>
      {run.open && <AmlRunDetail runId={run.open.run_id} onClose={run.back} />}
      <div className={run.open ? "hidden" : "pt-1 pb-6"}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-800">{t("amlTitle")}</h1>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{t("amlSubtitle")}</p>
          </div>
          <ExportButtons
            disabled={!body}
            exportFile={(format) =>
              amlBreakdownApi.export({ ...body, sort_by: sortBy, format, detail: perMatch })
            }
          >
            <CheckboxPill checked={perMatch} onChange={setPerMatch} label={t("onePerMatch")} />
          </ExportButtons>
        </div>

        <div className="mb-3 space-y-3 rounded-2xl p-3" style={glassCard}>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedSwitch
              options={[
                { value: "latest", label: t("currentScreeningOnly") },
                { value: "all", label: t("allScreenings") },
              ]}
              value={filters.latest_only ? "latest" : "all"}
              onChange={(v) => set({ latest_only: v === "latest" })}
            />
            <CheckboxPill
              checked={filters.matched_only}
              onChange={(v) => set({ matched_only: v })}
              label={t("withMatchesOnly")}
            />
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={t("searchCustomer")}
              className="w-48 rounded-lg border px-2.5 py-1.5 text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              size="sm"
              className="w-36"
              value={filters.customer_kind}
              onChange={(v) => set({ customer_kind: v })}
              options={opt(KINDS, "kind_", "allTypes")}
            />
            <FilterSelect
              size="sm"
              className="w-40"
              value={filters.band_code}
              onChange={(v) => set({ band_code: v })}
              options={[
                { value: "", label: t("allBands") },
                ...bands.map((b) => ({ value: b.code, label: b.name ?? b.code })),
              ]}
            />
            <FilterSelect
              size="sm"
              className="w-44"
              value={filters.risk_action_id}
              onChange={(v) => set({ risk_action_id: v })}
              options={[
                { value: "", label: t("allRiskActions") },
                ...actions.map((a) => ({
                  value: String(a.id),
                  label: a.inst_profile_name ? `${a.name} · ${a.inst_profile_name}` : a.name,
                })),
              ]}
            />
            <FilterSelect
              size="sm"
              className="w-48"
              value={filters.trigger}
              onChange={(v) => set({ trigger: v })}
              options={opt(TRIGGERS, "trigger_", "allSources")}
            />
            <FilterSelect
              size="sm"
              className="w-44"
              value={filters.status}
              onChange={(v) => set({ status: v })}
              options={opt(["DONE", "ERROR"], "runStatus_", "allStatuses")}
            />
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {t("scoreRange")}
              <input
                type="number"
                min={0}
                max={100}
                value={filters.min_score}
                onChange={(e) => set({ min_score: e.target.value })}
                placeholder="0"
                className={numberInput}
              />
              –
              <input
                type="number"
                min={0}
                max={100}
                value={filters.max_score}
                onChange={(e) => set({ max_score: e.target.value })}
                placeholder="100"
                className={numberInput}
              />
            </span>
          </div>
          <PeriodChips value={filters} onChange={set} allTime />
        </div>

        <div className="overflow-hidden rounded-2xl" style={glassCard}>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.run_id}
            isLoading={loading}
            title={t("amlTitle")}
            emptyTitle={t("noRuns")}
            serverPagination={{
              page,
              totalPages: pagination.totalPages ?? 1,
              totalRecords: pagination.totalRecords ?? rows.length,
              onPageChange: setPage,
              limit,
              onLimitChange: (n) => {
                setLimit(Math.min(n, 200));
                setPage(1);
              },
            }}
            serverSorted
            bare
          />
        </div>
      </div>
    </>
  );
}
