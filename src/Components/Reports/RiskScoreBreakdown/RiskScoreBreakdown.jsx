import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownUp } from "lucide-react";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { riskBreakdownApi } from "@/Services/Reports/riskBreakdown.api";
import { corporateRiskApi, individualRiskApi, riskActionApi } from "@/Services/Epurse/risk.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import {
  BandChip,
  ExportButtons,
  PeriodChips,
  atIst,
  glassCard,
  periodBody,
  useReportDetail,
} from "../Shared/reportShared";
import { BreakdownDetail } from "./BreakdownDetail";

const KINDS = ["INDIVIDUAL", "CORPORATE"];
const SOURCES = ["APPROVAL", "PORTAL", "BACKFILL"];
const numberInput = "w-20 rounded-lg border px-2.5 py-1.5 text-xs";

// Band codes (bands can differ per setup) and risk actions the viewer's
// institutions use, for the filters.
function useFilterOptions() {
  const [bands, setBands] = useState([]);
  const [actions, setActions] = useState([]);
  useEffect(() => {
    Promise.allSettled([
      individualRiskApi.list({ page: 1, limit: 200 }),
      corporateRiskApi.list({ page: 1, limit: 200 }),
    ]).then((results) => {
      const byCode = new Map();
      results.forEach(
        (r) =>
          r.status === "fulfilled" &&
          rowsOf(r.value).forEach((setup) =>
            (setup.levels ?? []).forEach((l) => !byCode.has(l.code) && byCode.set(l.code, l)),
          ),
      );
      setBands([...byCode.values()]);
    });
    riskActionApi
      .list({ page: 1, limit: 200 })
      .then((r) => setActions(rowsOf(r).filter((a) => Number(a.status) === 1)))
      .catch(() => setActions([]));
  }, []);
  return { bands, actions };
}

// Reports > Risk Score Breakdown (menu 107, View only): customers' kept risk
// assessments (the risk score only, not AML), each opening how its score
// was reached. Defaults to each customer's current assessment.
export function RiskScoreBreakdown() {
  const { t } = useTranslation(["reports", "common"]);
  const { bands, actions } = useFilterOptions();
  const [filters, setFilters] = useState({
    customer_kind: "",
    period: "",
    from: "",
    to: "",
    level_code: "",
    risk_action_id: "",
    min_score: "",
    max_score: "",
    source: "",
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
  const [detail, setDetail] = useState(false);
  const breakdown = useReportDetail();

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
        level_codes: f.level_code ? [f.level_code] : undefined,
        risk_action_ids: f.risk_action_id ? [Number(f.risk_action_id)] : undefined,
        min_score: num(f.min_score),
        max_score: num(f.max_score),
        sources: f.source ? [f.source] : undefined,
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
      const response = await riskBreakdownApi.list({ ...current, page, limit, sort_by: sortBy });
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

  const columns = [
    {
      key: "assessed_at",
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
          {t("assessedAt")} <ArrowDownUp size={11} />
        </button>
      ),
      render: (row) => (
        <span
          className={`whitespace-nowrap text-xs ${row.is_latest ? "" : "text-muted-foreground"}`}
        >
          {atIst(row.assessed_at)}
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
          onClick={() => breakdown.show(row)}
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
      key: "risk_score",
      label: t("score"),
      render: (row) => <span className="font-black tabular-nums">{row.risk_score}</span>,
    },
    {
      key: "level_name",
      label: t("band"),
      render: (row) => <BandChip name={row.level_name} color={row.level_color} />,
    },
    {
      key: "risk_action_name",
      label: t("riskAction"),
      render: (row) => <span className="text-xs">{row.risk_action_name ?? "—"}</span>,
    },
    {
      key: "risk_setup_name",
      label: t("setup"),
      render: (row) => <span className="text-xs">{row.risk_setup_name}</span>,
    },
    {
      key: "source_name",
      label: t("how"),
      render: (row) => <span className="text-xs">{row.source_name}</span>,
    },
    {
      key: "assessed_by",
      label: t("by"),
      render: (row) => <span className="text-xs">{row.assessed_by ?? "-"}</span>,
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (row) => <RowActions buttons={{ view: true }} onView={() => breakdown.show(row)} />,
    },
  ];

  const opt = (list, prefix, allKey) => [
    { value: "", label: t(allKey) },
    ...list.map((v) => ({ value: v, label: t(`${prefix}${v}`) })),
  ];

  return (
    <>
      {breakdown.open && (
        <BreakdownDetail
          customerKind={breakdown.open.customer_kind}
          assessmentId={breakdown.open.assessment_id}
          onClose={breakdown.back}
        />
      )}
      <div className={breakdown.open ? "hidden" : "pt-1 pb-6"}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-800">{t("breakdownTitle")}</h1>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {t("breakdownSubtitle")}
            </p>
          </div>
          <ExportButtons
            disabled={!body}
            exportFile={(format) =>
              riskBreakdownApi.export({ ...body, sort_by: sortBy, format, detail })
            }
          >
            <CheckboxPill checked={detail} onChange={setDetail} label={t("onePerCriterion")} />
          </ExportButtons>
        </div>

        <div className="mb-3 space-y-3 rounded-2xl p-3" style={glassCard}>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedSwitch
              options={[
                { value: "latest", label: t("currentOnly") },
                { value: "all", label: t("allAssessments") },
              ]}
              value={filters.latest_only ? "latest" : "all"}
              onChange={(v) => set({ latest_only: v === "latest" })}
            />
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={t("searchCustomer")}
              className="w-48 rounded-lg border px-2.5 py-1.5 text-xs"
            />
            <FilterSelect
              size="sm"
              className="w-36"
              value={filters.customer_kind}
              onChange={(v) => set({ customer_kind: v })}
              options={opt(KINDS, "kind_", "allTypes")}
            />
            <FilterSelect
              size="sm"
              className="w-36"
              value={filters.level_code}
              onChange={(v) => set({ level_code: v })}
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
              className="w-44"
              value={filters.source}
              onChange={(v) => set({ source: v })}
              options={opt(SOURCES, "source_", "allSources")}
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
            rowKey={(row) => `${row.customer_kind}:${row.assessment_id}`}
            isLoading={loading}
            title={t("breakdownTitle")}
            emptyTitle={t("noAssessments")}
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
