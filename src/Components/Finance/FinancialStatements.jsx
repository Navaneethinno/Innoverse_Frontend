import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { DateInput } from "@/Components/Common/DateInput";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListPanel } from "@/Components/Common/ListPanel";
import { MenuLink } from "@/Components/Common/MenuLink";
import { Spinner } from "@/Components/Common/Spinner";
import { glReportsApi } from "@/Services/Accounting/accounting.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ExportButtons } from "../Reports/Shared/reportShared";
import { glAmount } from "./accountingShared";
import { branchOptions, useCoreBanking } from "./coreBankingShared";
import { inputClass } from "./Deposits/depositShared";
import { DirectCashFlow, ProfitLossByDay, ProfitLossDetail, ResultRow } from "./GlReportSections";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { useInstitutionScope } from "./Loans/loanShared";

const today = () => new Date().toISOString().slice(0, 10);

// The statement calls, their sections and footer figures.
const KINDS = {
  balance_sheet: {
    call: "balance_sheet",
    exportFile: "balanceSheetExport",
    sections: ["assets", "liabilities", "equity"],
    footer: [
      ["total_assets", "totalAssets"],
      ["total_liabilities_and_equity", "totalLiabEquity"],
    ],
    dated: true,
  },
  profit_loss: {
    call: "profit_loss",
    exportFile: "profitLossExport",
    sections: ["income", "expenses"],
    footer: [["net_profit", "netProfit"]],
  },
  cash_flow: {
    call: "cash_flow",
    exportFile: "cashFlowExport",
    sections: ["operating", "investing", "financing"],
    footer: [
      ["net_change", "netChange"],
      ["opening_cash", "openingCash"],
      ["closing_cash", "closingCash"],
    ],
  },
};

// GL Reports › Balance sheet, Profit and loss, Cash flow: from the ledger,
// for the institution or one branch, lines grouped by financial statement
// area (each expandable to its GLs). `difference` is 0 when the books
// balance (or the cash reconciles).
export function FinancialStatement({ kind, currencies }) {
  const { t } = useTranslation("statements");
  const spec = KINDS[kind];
  const branches = branchOptions(useCoreBanking(useInstitutionScope().scope));
  const [q, setQ] = useState({ as_of: today(), from: "", to: "", currency_id: "", branch_id: "" });
  // Profit and loss: Summary | Detailed | By day. Cash flow: Direct | Indirect.
  const [view, setView] = useState(kind === "cash_flow" ? "DIRECT" : "summary");
  // Only the cash flow method changes the summary call; the P&L views load their own.
  const indirect = kind === "cash_flow" && view === "INDIRECT";
  const [data, setData] = useState(null);
  const body = useMemo(
    () => ({
      ...(spec.dated ? (q.as_of ? { as_of: q.as_of } : {}) : { ...(q.from ? { from: q.from } : {}), ...(q.to ? { to: q.to } : {}) }),
      ...(q.currency_id ? { currency_id: Number(q.currency_id) } : {}),
      ...(q.branch_id ? { branch_id: Number(q.branch_id) } : {}),
      ...(indirect ? { method: "INDIRECT" } : {}),
    }),
    [q, spec.dated, indirect],
  );
  const exportBody = { ...body, ...(view === "detail" ? { detail: true } : view === "by_day" ? { by_day: true } : {}) };
  useEffect(() => {
    let cancelled = false;
    setData(null);
    glReportsApi[spec.call](body)
      .then((r) => !cancelled && setData(rowsOf(r)[0] ?? {}))
      .catch((e) => {
        if (cancelled) return;
        notifications.error(e.message);
        setData({});
      });
    return () => {
      cancelled = true;
    };
  }, [body, spec.call]);
  const cur = data?.currency_code;
  const set = (key) => (v) => setQ((x) => ({ ...x, [key]: v }));
  const diff = Number(data?.difference ?? 0);

  return (
    <ListPanel
      tabs={[]}
      filters={
        <>
          {spec.dated ? (
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              {t("asOf")}
              <DateInput className={cn(inputClass, "w-auto")} value={q.as_of} max={today()} onChange={(e) => set("as_of")(e.target.value)} />
            </label>
          ) : (
            <>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                {t("from")}
                <DateInput className={cn(inputClass, "w-auto")} value={q.from} max={q.to || today()} onChange={(e) => set("from")(e.target.value)} />
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                {t("to")}
                <DateInput className={cn(inputClass, "w-auto")} value={q.to} min={q.from || undefined} max={today()} onChange={(e) => set("to")(e.target.value)} />
              </label>
            </>
          )}
          <FilterSelect value={q.currency_id} onChange={set("currency_id")} options={[{ value: "", label: t("baseCurrency") }, ...currencies.map((c) => ({ value: String(c.id), label: c.alpha_code }))]} />
          {branches.length > 0 && <FilterSelect value={q.branch_id} onChange={set("branch_id")} options={[{ value: "", label: t("wholeInstitution") }, ...branches]} />}
          {kind === "profit_loss" && <SegmentedSwitch value={view} onChange={setView} options={["summary", "detail", "by_day"].map((v) => ({ value: v, label: t(`plView_${v}`) }))} />}
          {kind === "cash_flow" && <SegmentedSwitch value={view} onChange={setView} options={["DIRECT", "INDIRECT"].map((v) => ({ value: v, label: t(`method_${v}`) }))} />}
          <ExportButtons exportFile={(format) => glReportsApi[spec.exportFile]({ ...exportBody, format })} />
        </>
      }
    >
      {!data ? (
        <div className="flex justify-center p-8">
          <Spinner size={18} />
        </div>
      ) : (
        <div className="grid gap-4 p-4" data-tour={`statement-${kind}`}>
          <p className="text-xs text-muted-foreground">
            {t(`hint_${kind}`)}{" "}
            {data.branch_name && <b>{t("branchBooks", { name: data.branch_name })}</b>}
            {(data.from || data.as_of) && <span> · {spec.dated ? data.as_of : `${data.from} – ${data.to}`}</span>}
          </p>
          {kind === "cash_flow" && data.cash_configured === false && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              {t("cashNotConfigured")} <MenuLink slug="corebankingsetup" label={t("openCoreBanking")} />
            </p>
          )}
          {kind === "profit_loss" && view === "detail" ? (
            <ProfitLossDetail body={body} currency={cur} />
          ) : kind === "profit_loss" && view === "by_day" ? (
            <ProfitLossByDay body={body} currency={cur} />
          ) : kind === "cash_flow" && data.method === "DIRECT" ? (
            data.cash_configured !== false && <DirectCashFlow data={data} />
          ) : (
            <StatementBody kind={kind} spec={spec} data={data} cur={cur} diff={diff} />
          )}
        </div>
      )}
    </ListPanel>
  );
}

// The summary statement: its sections, the balance sheet's income and
// expenditure block, the footer figures and the result.
function StatementBody({ kind, spec, data, cur, diff }) {
  const { t } = useTranslation("statements");
  return (
    <>
          {spec.sections.map((key) => (
            <StatementSection key={key} title={t(`section_${key}`)} section={data[key]} currency={cur} changeLabels={kind === "cash_flow" && key === "operating"} />
          ))}
          <div className="grid gap-1 rounded-2xl border border-border bg-muted/30 p-4">
            {spec.footer.filter(([field]) => !(field === "net_profit" && data.result)).map(([field, label]) => (
              <div key={field} className="flex justify-between gap-3 text-sm">
                <b>{t(label)}</b>
                <b className={cn("tabular-nums", Number(data[field]) < 0 && "text-red-700")}>{glAmount(data[field] ?? "0", cur)}</b>
              </div>
            ))}
            {data.difference != null && (
              <div className={cn("flex justify-between gap-3 text-sm", diff ? "font-black text-red-700" : "text-muted-foreground")}>
                <span>{t("difference")}</span>
                <span className="tabular-nums">{glAmount(data.difference, cur)}</span>
              </div>
            )}
          </div>
          {diff !== 0 && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{t(kind === "cash_flow" ? "cashNotReconciled" : "notBalanced")}</p>}
          {kind === "balance_sheet" && (data.income || data.expenses) && (
            <>
              <StatementSection title={t("ieIncome")} section={data.income} currency={cur} />
              <StatementSection title={t("ieExpenditure")} section={data.expenses} currency={cur} />
              <ResultRow result={data.result} currency={cur} />
              <p className="text-[11px] text-muted-foreground">{t("resultEqualsEquity")}</p>
            </>
          )}
          {kind === "profit_loss" && <ResultRow result={data.result} currency={cur} />}
    </>
  );
}

// A section: its lines (each opens to the GLs behind it) and its total.
// Cash flow's operating lines (other than the profit) read "Change in …".
function StatementSection({ title, section, currency, changeLabels }) {
  const { t } = useTranslation("statements");
  const [open, setOpen] = useState(() => new Set());
  const lines = section?.lines ?? [];
  const toggle = (i) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const label = (l) => {
    const text = l.code && t(`line_${l.code}`, { defaultValue: "" }) ? t(`line_${l.code}`) : l.label;
    return changeLabels && l.code !== "PROFIT" ? t("changeIn", { label: text }) : text;
  };
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="overflow-hidden rounded-2xl border border-border">
        {!lines.length && <p className="px-4 py-3 text-sm text-muted-foreground">{t("noLines")}</p>}
        {lines.map((l, i) => {
          const accounts = l.accounts ?? [];
          return (
            <div key={i} className="border-b border-border last:border-b-0">
              <button
                type="button"
                disabled={!accounts.length}
                onClick={() => toggle(i)}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted/40 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="w-4 shrink-0 text-muted-foreground">{accounts.length > 0 && (open.has(i) ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{label(l)}</span>
                  {l.sub_label && <span className="ml-1.5 text-xs text-muted-foreground">· {l.sub_label}</span>}
                </span>
                <span className={cn("tabular-nums", Number(l.amount) < 0 && "text-red-700")}>{glAmount(l.amount, currency)}</span>
              </button>
              {open.has(i) && (
                <ul className="bg-muted/30 py-1">
                  {accounts.map((a) => (
                    <li key={a.id} className="flex justify-between gap-3 py-1 pl-10 pr-4 text-xs">
                      <span>
                        <span className="font-mono text-muted-foreground">{a.gl_code || a.account_number}</span> {a.name}
                      </span>
                      <span className={cn("tabular-nums", Number(a.amount) < 0 && "text-red-700")}>{glAmount(a.amount, currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        <div className="flex justify-between gap-3 bg-muted/40 px-4 py-2 text-sm font-black">
          <span>{t("totalOf", { title })}</span>
          <span className={cn("tabular-nums", Number(section?.total) < 0 && "text-red-700")}>{glAmount(section?.total ?? "0", currency)}</span>
        </div>
      </div>
    </section>
  );
}
