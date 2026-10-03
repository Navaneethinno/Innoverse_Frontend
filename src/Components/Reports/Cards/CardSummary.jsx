import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard } from "lucide-react";
import { AnimatedNumber } from "@/Components/Common/AnimatedNumber";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Spinner } from "@/Components/Common/Spinner";
import { money } from "@/Components/Epurse/Accounts/accountShared";
import { cardsApi } from "@/Services/Cards/cards.api";
import { txnReportsApi } from "@/Services/Transactions/transactions.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { MiniTable } from "../../Loans/loanShared";
import { cardWord } from "../../Cards/Operations/cardOpsShared";
import { ExportButtons, PeriodChips, glassCard, periodBody, rangeLabel } from "../Shared/reportShared";

// Each section's keys, and the words each key's values use.
const SECTIONS = {
  cards: [["product"], ["form_factor", "opt"], ["ops_status", "ops"]],
  issued: [["product"], ["how", "how"]],
  requests: [["request_type", "rtype"], ["request_status", "req"]],
  fees: [["fee_type"]],
  payments: [["txn_type", "txnt"], ["status", "pay"]],
};
const WITH_AMOUNTS = ["fees", "payments"];

// REPORTS > Card Summary (menu 202): cards today, and what was issued,
// requested, charged and paid by card in the period. Excel / CSV of the
// same body.
export function CardSummary() {
  const { t } = useTranslation(["cards", "reports"]);
  const api = txnReportsApi.cardSummary;
  const [filters, setFilters] = useState({ period: "THIS_MONTH", from: "", to: "", card_product_id: "" });
  const [products, setProducts] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cardsApi
      .options({})
      .then((r) => setProducts(rowsOf(r)[0]?.card_products ?? []))
      .catch(() => setProducts([]));
  }, []);

  const body = useMemo(() => {
    const period = periodBody(filters);
    return period ? { ...period, ...(filters.card_product_id ? { card_product_id: Number(filters.card_product_id) } : {}) } : null;
  }, [filters]);
  const bodyKey = JSON.stringify(body);

  useEffect(() => {
    if (!body) return undefined;
    let cancelled = false;
    setLoading(true);
    api
      .list(body)
      .then((r) => !cancelled && setData(rowsOf(r)[0] ?? null))
      .catch((e) => !cancelled && notifications.error(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // bodyKey stands for body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyKey]);

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const total = (lines) => lines.reduce((n, l) => n + Number(l.count ?? 0), 0);

  return (
    <div className="pb-8 pt-4">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
          <CreditCard size={22} className="text-primary" /> {t("summaryTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("summarySubtitle")}</p>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl p-4" style={glassCard}>
        <PeriodChips value={filters} onChange={set} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="w-full max-w-xs">
            <FilterSelect value={filters.card_product_id} onChange={(v) => set({ card_product_id: v })} options={[{ value: "", label: t("anyProduct") }, ...products.map((p) => ({ value: String(p.id), label: `${p.product_code} · ${p.product_name}` }))]} />
          </div>
          <ExportButtons disabled={!body} exportFile={(format) => api.export({ ...body, format })} />
        </div>
      </div>

      {loading && !data && <Spinner size={18} />}
      {data && (
        <>
          {data.range && <p className="mb-3 text-xs font-semibold text-muted-foreground">{rangeLabel(data.range)}</p>}
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.keys(SECTIONS).map((key) => (
              <div key={key} className="min-w-0 rounded-2xl border border-border bg-card p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t(`sum_${key}`)}</p>
                <p className="mt-1 text-2xl font-black tabular-nums"><AnimatedNumber value={total(data[key] ?? [])} /></p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {Object.entries(SECTIONS).map(([key, keys]) => (
              <div key={key} className="min-w-0 rounded-2xl border border-border bg-card p-4">
                <p className="mb-1 text-sm font-bold">{t(`sum_${key}`)}</p>
                <p className="mb-2 text-[11px] text-muted-foreground">{t(`sumHint_${key}`)}</p>
                <MiniTable
                  rows={data[key] ?? []}
                  rowKey={(l, i) => `${JSON.stringify(l.keys)}-${i}`}
                  empty={t("nothingInPeriod")}
                  columns={[
                    ...keys.map(([k, prefix]) => ({ key: k, label: t(`key_${k}`), render: (l) => (prefix ? cardWord(t, prefix, l.keys?.[k]) : (l.keys?.[k] ?? "—")) })),
                    { key: "count", label: t("count"), align: "right", render: (l) => <b className="tabular-nums">{l.count}</b> },
                    ...(WITH_AMOUNTS.includes(key) ? [{ key: "amount", label: t("amount"), align: "right", render: (l) => <span className="tabular-nums">{money(l.amount, l.currency_code)}</span> }] : []),
                  ]}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
