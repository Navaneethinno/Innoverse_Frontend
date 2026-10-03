import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertOctagon, BarChart3, Coins, Undo2 } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { money } from "@/Components/Epurse/Accounts/accountShared";
import { useMasterCurrencies } from "@/Hooks/Institution/institutionCurrencyHooks";
import { txnReportsApi } from "@/Services/Transactions/transactions.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ExportButtons, PeriodChips, atIst, glassCard, periodBody } from "../Shared/reportShared";

const CHANNELS = ["ADMIN", "SCHEDULER", "APP", "WEB", "POS"];
const INITIATORS = ["STAFF", "SYSTEM", "CUSTOMER", "MERCHANT"];
const STATUSES = ["POSTED", "REVERSED", "FAILED"];
const GROUPS = {
  summary: { all: ["DAY", "MONTH", "TYPE", "CHANNEL", "STATUS", "INITIATOR"], initial: ["DAY", "TYPE"] },
  feeIncome: { all: ["DAY", "MONTH", "TYPE", "RULE", "PURPOSE", "KIND"], initial: ["DAY", "RULE", "PURPOSE"] },
};
const REPORTS = {
  summary: { icon: BarChart3, filters: ["channels", "statuses", "initiator_types"] },
  feeIncome: { icon: Coins, filters: ["channels", "initiator_types"] },
  failed: { icon: AlertOctagon, filters: ["channels", "initiator_types"] },
  reversals: { icon: Undo2, filters: ["channels", "initiator_types"] },
};

// The filter chips for one list filter (multi-select; none = all).
function Chips({ values, value, onChange, label }) {
  const { t } = useTranslation("txnReports");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
      {values.map((v) => {
        const on = value.includes(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== v) : [...value, v])}
            className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-primary hover:text-primary")}
          >
            {t(`val_${v}`, { defaultValue: v })}
          </button>
        );
      })}
    </div>
  );
}

// REPORTS > Transaction Summary (191), Fee Income (192), Failed
// Transactions (193), Reversals (194): a period, filters, the figures and
// an Excel / CSV of the same body. `kind` picks the report.
function TxnReport({ kind }) {
  const { t } = useTranslation(["txnReports", "reports"]);
  const api = txnReportsApi[kind];
  const { currencies } = useMasterCurrencies();
  const [filters, setFilters] = useState({ period: "THIS_MONTH", from: "", to: "", currency_code: "", channels: [], statuses: [], initiator_types: [], txn_types: "", error_codes: "", group_by: GROUPS[kind]?.initial ?? [] });
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const Icon = REPORTS[kind].icon;
  const paged = kind === "failed" || kind === "reversals";

  const body = useMemo(() => {
    const period = periodBody(filters);
    if (!period) return null;
    const list = (s) => s.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
    return {
      ...period,
      ...(filters.currency_code ? { currency_code: Number(filters.currency_code) } : {}),
      ...Object.fromEntries(REPORTS[kind].filters.filter((k) => filters[k].length).map((k) => [k, filters[k]])),
      ...(list(filters.txn_types).length ? { txn_types: list(filters.txn_types) } : {}),
      ...(kind === "failed" && filters.error_codes.trim() ? { error_codes: filters.error_codes.split(",").map((x) => x.trim()).filter(Boolean) } : {}),
      ...(GROUPS[kind] && filters.group_by.length ? { group_by: filters.group_by } : {}),
    };
  }, [filters, kind]);
  const bodyKey = JSON.stringify(body);

  useEffect(() => {
    setPage(1);
  }, [bodyKey]);

  useEffect(() => {
    if (!body) return undefined;
    let cancelled = false;
    setLoading(true);
    api
      .list(paged ? { ...body, page, limit } : body)
      .then((r) => {
        if (cancelled) return;
        setData(paged ? rowsOf(r) : (rowsOf(r)[0] ?? { groups: [] }));
        setPagination(r?.pagination ?? {});
      })
      .catch((e) => !cancelled && notifications.error(e.message))
      .finally(() => !cancelled && setLoading(false));
    if (kind === "failed") {
      api
        .summary(body)
        .then((r) => !cancelled && setSummary(rowsOf(r)))
        .catch(() => !cancelled && setSummary([]));
    }
    return () => {
      cancelled = true;
    };
    // bodyKey stands for body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyKey, page, limit, kind]);

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const groupBy = data?.group_by ?? filters.group_by;

  // Totals per currency of the grouped reports.
  const totals = useMemo(() => {
    if (paged || !data?.groups) return [];
    const by = new Map();
    for (const g of data.groups) {
      const x = by.get(g.currency_code) ?? { currency_code: g.currency_code, txn_count: 0, amount: 0, fee: 0, tax: 0 };
      x.txn_count += Number(g.txn_count ?? 0);
      x.amount += Number(g.amount ?? 0);
      x.fee += Number(g.fee ?? 0);
      x.tax += Number(g.tax ?? 0);
      by.set(g.currency_code, x);
    }
    return [...by.values()];
  }, [data, paged]);

  const groupColumns = [
    ...groupBy.map((g) => ({ key: g, label: t(`group_${g}`), render: (r) => <span className="text-xs font-semibold">{r.keys?.[g.toLowerCase()] || t("none")}</span>, sortValue: (r) => r.keys?.[g.toLowerCase()] })),
    { key: "currency_code", label: t("currency"), render: (r) => <span className="text-xs">{r.currency_code}</span> },
    { key: "txn_count", label: t("count"), render: (r) => <span className="text-xs tabular-nums">{r.txn_count}</span> },
    { key: "amount", label: t("amount"), render: (r) => <span className="text-xs font-bold tabular-nums">{money(r.amount, r.currency_code)}</span> },
    { key: "fee", label: t("fee"), render: (r) => <span className="text-xs tabular-nums">{money(r.fee, r.currency_code)}</span> },
    kind === "feeIncome" && { key: "tax", label: t("tax"), render: (r) => <span className="text-xs tabular-nums">{money(r.tax, r.currency_code)}</span> },
  ].filter(Boolean);

  const failedColumns = [
    { key: "rrn", label: "RRN", render: (r) => <span className="font-mono text-xs font-bold">{r.rrn}</span> },
    { key: "tran_date_time", label: t("when"), render: (r) => <span className="whitespace-nowrap text-xs">{atIst(r.tran_date_time)}</span> },
    { key: "txn_type", label: t("type"), render: (r) => <span className="text-xs">{r.txn_type}</span> },
    { key: "amount", label: t("amount"), render: (r) => <span className="text-xs tabular-nums">{money(r.amount, r.currency_code)}</span> },
    { key: "reason", label: t("reason"), align: "left", render: (r) => <span className="text-xs text-red-700">{r.reason} <span className="font-mono text-[10px] opacity-70">{r.error_code}</span></span> },
    { key: "channel_type", label: t("channel"), render: (r) => <span className="text-[11px]">{r.channel_type} · {r.initiator_type}</span> },
    { key: "user_name", label: t("user"), render: (r) => <span className="text-xs">{r.user_name || "—"}</span> },
  ];
  const reversalColumns = [
    { key: "rrn", label: "RRN", render: (r) => <span className="font-mono text-xs font-bold">{r.rrn}</span> },
    { key: "tran_date_time", label: t("when"), render: (r) => <span className="whitespace-nowrap text-xs">{atIst(r.tran_date_time)}</span> },
    { key: "amount", label: t("amount"), render: (r) => <span className="text-xs font-bold tabular-nums">{money(r.amount, r.currency_code)}</span> },
    { key: "fee_returned", label: t("feeReturned"), render: (r) => <span className="text-xs tabular-nums">{money(r.fee_returned, r.currency_code)}</span> },
    { key: "txn_desc", label: t("reason"), align: "left", render: (r) => <span className="text-xs">{r.txn_desc}</span> },
    { key: "org", label: t("original"), render: (r) => <span className="text-[11px]"><span className="font-mono">{r.org_rrn}</span> · {r.org_txn_type}<br />{atIst(r.org_tran_date_time)} · {r.org_user_name}</span> },
    { key: "user_name", label: t("reversedBy"), render: (r) => <span className="text-xs">{r.user_name} · {r.initiator_type}</span> },
    { key: "source_module", label: t("source"), render: (r) => <span className="text-[11px]">{r.source_module}</span> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
          <Icon size={22} className="text-primary" /> {t(`title_${kind}`)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t(`subtitle_${kind}`)}</p>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl p-4" style={glassCard}>
        <PeriodChips value={filters} onChange={set} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FilterSelect value={filters.currency_code} onChange={(v) => set({ currency_code: v })} options={[{ value: "", label: t("anyCurrency") }, ...currencies.map((c) => ({ value: String(c.id), label: `${c.alpha_code} · ${c.currency_name ?? c.name ?? ""}` }))]} />
          <input className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" placeholder={t(kind === "reversals" ? "reversedTypes" : "txnTypes")} value={filters.txn_types} onChange={(e) => set({ txn_types: e.target.value })} />
          {kind === "failed" && <input className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" placeholder={t("errorCodes")} value={filters.error_codes} onChange={(e) => set({ error_codes: e.target.value })} />}
        </div>
        {REPORTS[kind].filters.includes("statuses") && <Chips label={t("status")} values={STATUSES} value={filters.statuses} onChange={(v) => set({ statuses: v })} />}
        <Chips label={t("channel")} values={CHANNELS} value={filters.channels} onChange={(v) => set({ channels: v })} />
        <Chips label={t("initiator")} values={INITIATORS} value={filters.initiator_types} onChange={(v) => set({ initiator_types: v })} />
        {GROUPS[kind] && <Chips label={t("groupBy")} values={GROUPS[kind].all} value={filters.group_by} onChange={(v) => set({ group_by: v })} />}
        <div className="flex justify-end">
          <ExportButtons disabled={!body} exportFile={(format) => api.export({ ...body, format })} />
        </div>
      </div>

      {totals.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {totals.map((x) => (
            <div key={x.currency_code} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("totalIn", { currency: x.currency_code, count: x.txn_count })}</p>
              <p className="mt-1 text-xl font-black tabular-nums">{money(kind === "feeIncome" ? x.fee : x.amount, x.currency_code)}</p>
              <p className="text-xs text-muted-foreground">{kind === "feeIncome" ? t("plusTax", { tax: money(x.tax, x.currency_code) }) : t("feesX", { fee: money(x.fee, x.currency_code) })}</p>
            </div>
          ))}
        </div>
      )}

      {kind === "failed" && summary.length > 0 && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-bold">{t("topReasons")}</p>
          <div className="grid gap-1.5">
            {summary.map((s) => (
              <div key={`${s.error_code}-${s.txn_type}`} className="flex items-center gap-3 text-xs">
                <span className="w-10 shrink-0 text-right font-black tabular-nums text-red-700">{s.count}</span>
                <span className="min-w-0 flex-1 truncate">{s.reason}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{s.txn_type} · {s.error_code}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable
        columns={paged ? (kind === "failed" ? failedColumns : reversalColumns) : groupColumns}
        rows={paged ? (data ?? []) : (data?.groups ?? [])}
        rowKey={(r, i) => r.rrn ?? `${JSON.stringify(r.keys)}-${r.currency_code}-${i}`}
        isLoading={loading}
        title={t(`title_${kind}`)}
        emptyTitle={t("noRows")}
        {...(paged
          ? {
              serverSorted: true,
              serverPagination: {
                page,
                totalPages: pagination.totalPages ?? 1,
                totalRecords: pagination.totalRecords ?? 0,
                onPageChange: setPage,
                limit,
                onLimitChange: (n) => {
                  setLimit(Math.min(n, 200));
                  setPage(1);
                },
              },
            }
          : {})}
      />
    </div>
  );
}

export const TransactionSummary = () => <TxnReport kind="summary" />;
export const FeeIncome = () => <TxnReport kind="feeIncome" />;
export const FailedTransactions = () => <TxnReport kind="failed" />;
export const Reversals = () => <TxnReport kind="reversals" />;
